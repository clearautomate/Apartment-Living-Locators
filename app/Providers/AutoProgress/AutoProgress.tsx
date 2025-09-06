// app/providers/AutoProgress.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { progressRef } from './progressRef';

// ---------- URL helpers ----------
function toAbsURL(href: string) {
    return new URL(href, location.href);
}
function isSameOrigin(href: string) {
    try { return toAbsURL(href).origin === location.origin; } catch { return false; }
}
function isHashOnlyChange(nextHref: string) {
    const cur = new URL(location.href);
    const nxt = toAbsURL(nextHref);
    return cur.pathname === nxt.pathname && cur.search === nxt.search && cur.hash !== nxt.hash;
}
function isNoOpNavigation(nextHref: string) {
    const cur = new URL(location.href);
    const nxt = toAbsURL(nextHref);
    return (
        cur.origin === nxt.origin &&
        cur.pathname === nxt.pathname &&
        cur.search === nxt.search &&
        cur.hash === nxt.hash
    );
}

// snapshot of current URL (path+search+hash)
const keyNow = () => `${location.pathname}${location.search}${location.hash}`;

// after paint (avoid insertion-effect updates)
const afterPaint = (fn: () => void) => requestAnimationFrame(fn);

export default function AutoProgress({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const search = useSearchParams();

    const [visible, setVisible] = useState(false);
    const [width, setWidth] = useState(0); // 0..100

    const timersRef = useRef<number[]>([]);
    const opIdRef = useRef(0);
    const modeRef = useRef<'idle' | 'loading' | 'pulse'>('idle');

    const clearTimers = () => {
        timersRef.current.forEach(id => clearTimeout(id));
        timersRef.current = [];
    };
    const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms) as unknown as number;
        timersRef.current.push(id);
        return id;
    };
    const resetBar = () => {
        clearTimers();
        setVisible(false);
        setWidth(0);
        modeRef.current = 'idle';
    };

    // ---------- start / done ----------
    const start = useMemo(
        () => () => {
            if (modeRef.current === 'loading') return;
            clearTimers();
            const myOp = ++opIdRef.current;
            modeRef.current = 'loading';

            setVisible(true);
            setWidth(2);
            // staged ramps (CSS anim does the smoothing)
            schedule(() => { if (opIdRef.current === myOp) setWidth(25); }, 100);
            schedule(() => { if (opIdRef.current === myOp) setWidth(55); }, 400);
            schedule(() => { if (opIdRef.current === myOp) setWidth(78); }, 1200);
            schedule(() => { if (opIdRef.current === myOp) setWidth(90); }, 2500);

            // watchdog: force-finish after 10s
            schedule(() => { if (opIdRef.current === myOp) done(150); }, 10000);
        },
        []
    );

    const done = useMemo(
        () => (hideDelay = 200) => {
            ++opIdRef.current; // invalidate ramps
            clearTimers();
            if (!visible) {
                // If not showing, just ensure a clean reset
                modeRef.current = 'idle';
                setWidth(0);
                setVisible(false);
                return;
            }
            setWidth(100);
            schedule(() => {
                setVisible(false);
                setWidth(0);
                modeRef.current = 'idle';
            }, hideDelay);
        },
        [visible]
    );

    // ---------- same-URL PULSE ----------
    const pulse = useMemo(
        () => (ms = 450) => {
            clearTimers();
            const myOp = ++opIdRef.current;
            modeRef.current = 'pulse';

            if (visible) {
                setVisible(false);
                setWidth(0);
                schedule(() => {
                    if (opIdRef.current !== myOp) return;
                    setVisible(true);
                    setWidth(2);
                    schedule(() => { if (opIdRef.current === myOp) setWidth(60); }, 16);
                    schedule(() => {
                        if (opIdRef.current !== myOp) return;
                        setWidth(100);
                        schedule(() => { if (opIdRef.current === myOp) resetBar(); }, 200);
                    }, ms);
                }, 32);
            } else {
                setVisible(true);
                setWidth(2);
                schedule(() => { if (opIdRef.current === myOp) setWidth(60); }, 16);
                schedule(() => {
                    if (opIdRef.current !== myOp) return;
                    setWidth(100);
                    schedule(() => { if (opIdRef.current === myOp) resetBar(); }, 200);
                }, ms);
            }
        },
        [visible]
    );

    // async wrappers for start/pulse, but CANCEL if URL already changed
    const startAsync = () => {
        const scheduledFrom = keyNow();
        afterPaint(() => {
            if (keyNow() !== scheduledFrom) return; // URL changed already; don't start
            start();
        });
    };
    const pulseAsync = (ms?: number) => {
        const scheduledFrom = keyNow();
        afterPaint(() => {
            if (keyNow() !== scheduledFrom) return; // URL changed; don't pulse old op
            pulse(ms);
        });
    };

    // Finish on URL change — ALWAYS call done (no visible guard)
    useEffect(() => {
        done(150);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, search?.toString()]);

    // ---------- global listeners ----------
    useEffect(() => {
        progressRef.start = start;
        progressRef.done = done;
        progressRef.pulse = pulse;
        return () => {
            progressRef.start = undefined;
            progressRef.done = undefined;
            progressRef.pulse = undefined;
        };
    }, [start, done, pulse]);


    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            const target = (e.composedPath?.()[0] ?? e.target) as Element | null;
            const anchor = target && (target.closest?.('a[href]') as HTMLAnchorElement | null);
            if (!anchor) return;
            if (anchor.target && anchor.target !== '_self') return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
            if (!isSameOrigin(href)) return;
            if (isHashOnlyChange(href)) return;

            if (isNoOpNavigation(href)) pulseAsync();
            else startAsync();
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const target = e.target as Element | null;
            const anchor = target && (target.closest?.('a[href]') as HTMLAnchorElement | null);
            if (!anchor) return;
            if (anchor.target && anchor.target !== '_self') return;

            const href = anchor.getAttribute('href') || '';
            if (!isSameOrigin(href) || isHashOnlyChange(href)) return;

            if (isNoOpNavigation(href)) pulseAsync();
            else startAsync();
        };

        const onSubmit = (e: Event) => {
            const form = e.target as HTMLFormElement;
            const action = form.getAttribute('action') || location.href;
            if (!isSameOrigin(action)) return;
            if (isNoOpNavigation(action)) pulseAsync();
            else startAsync();
        };

        const onPopState = () => startAsync();

        // Patch history for programmatic nav
        const _push = history.pushState;
        const _replace = history.replaceState;

        history.pushState = function (this: History, ...args) {
            try {
                const url = args[2] as string | URL | null | undefined;
                if (url != null) {
                    const href = typeof url === 'string' ? url : url.toString();
                    if (!isSameOrigin(href) || isHashOnlyChange(href)) {
                        // ignore
                    } else if (isNoOpNavigation(href)) {
                        pulseAsync();
                    } else {
                        startAsync();
                    }
                }
            } catch { }
            return _push.apply(this, args as any);
        };

        history.replaceState = function (this: History, ...args) {
            try {
                const url = args[2] as string | URL | null | undefined;
                if (url != null) {
                    const href = typeof url === 'string' ? url : url.toString();
                    if (!isSameOrigin(href) || isHashOnlyChange(href)) {
                        // ignore
                    } else if (isNoOpNavigation(href)) {
                        pulseAsync();
                    } else {
                        startAsync();
                    }
                }
            } catch { }
            return _replace.apply(this, args as any);
        };

        addEventListener('pointerdown', onPointerDown, { capture: true });
        addEventListener('keydown', onKeyDown, { capture: true });
        addEventListener('submit', onSubmit, { capture: true });
        addEventListener('popstate', onPopState);

        return () => {
            removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
            removeEventListener('keydown', onKeyDown, { capture: true } as any);
            removeEventListener('submit', onSubmit, { capture: true } as any);
            removeEventListener('popstate', onPopState);
            history.pushState = _push;
            history.replaceState = _replace;
            clearTimers();
        };
    }, []);

    return (
        <>
            <div
                aria-hidden
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    height: visible ? 3 : 0,
                    width: `${width}%`,
                    background: 'linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(99,102,241,1) 100%)',
                    boxShadow: visible ? '0 0 8px rgba(99,102,241,.5)' : 'none',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    transition: 'width .25s linear, height .25s ease, box-shadow .25s ease',
                    willChange: 'width',
                }}
            />
            {children}
        </>
    );
}
