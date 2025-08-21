// lib/acl/acl.ts
export type FieldPolicy<Role extends string = string> = {
    read: Role[];
    write: Role[];
};

type AnyRecord = Record<string, unknown>;

/** Build a Prisma `select` object limiting columns to what `role` can read. */
export function buildSelect<Role extends string>(
    policy: Record<string, FieldPolicy<Role>>,
    role: Role
): Record<string, true> {
    const select: Record<string, true> = {};
    for (const [field, rules] of Object.entries(policy)) {
        if (rules.read.includes(role)) select[field] = true;
    }
    return select;
}

/** List of fields readable by role. Useful for manual shaping. */
export function readableFields<Role extends string>(
    policy: Record<string, FieldPolicy<Role>>,
    role: Role
): string[] {
    return Object.entries(policy)
        .filter(([, rules]) => rules.read.includes(role))
        .map(([k]) => k);
}

/** List of fields writable by role. */
export function writableFields<Role extends string>(
    policy: Record<string, FieldPolicy<Role>>,
    role: Role
): string[] {
    return Object.entries(policy)
        .filter(([, rules]) => rules.write.includes(role))
        .map(([k]) => k);
}

/**
 * Keep only fields the role can write (for create/update data).
 * By default, silently drops forbidden fields. Set `strict=true` to throw if any were present.
 */
export function sanitizeWriteInput<Role extends string, T extends AnyRecord>(
    policy: Record<string, FieldPolicy<Role>>,
    role: Role,
    data: T,
    opts?: { strict?: boolean; allowedExtra?: string[] } // allowedExtra for prisma meta fields like relations/connect
): Partial<T> {
    const allowed = new Set([...writableFields(policy, role), ...(opts?.allowedExtra ?? [])]);
    const out: AnyRecord = {};
    const forbiddenTouched: string[] = [];

    for (const [k, v] of Object.entries(data ?? {})) {
        if (allowed.has(k)) out[k] = v;
        else if (v !== undefined) forbiddenTouched.push(k);
    }

    if (opts?.strict && forbiddenTouched.length) {
        throw new Error(
            `Forbidden write fields for role "${String(role)}": ${forbiddenTouched.join(", ")}`
        );
    }
    return out as Partial<T>;
}

/**
 * Ensure an update only touches writable fields; throws if not.
 * Useful when you prefer explicit checks over silent sanitizing.
 */
export function assertWritable<Role extends string>(
    policy: Record<string, FieldPolicy<Role>>,
    role: Role,
    data: AnyRecord
) {
    const allowed = new Set(writableFields(policy, role));
    const bad = Object.keys(data ?? {}).filter((k) => !allowed.has(k));
    if (bad.length) {
        throw new Error(`Forbidden write fields for role "${String(role)}": ${bad.join(", ")}`);
    }
}

/**
 * Given a full record from DB, keep only readable fields for the role.
 * (Handy if you didn't use `select` for some reason.)
 */
export function filterReadableResult<Role extends string, T extends AnyRecord>(
    policy: Record<string, FieldPolicy<Role>>,
    role: Role,
    row: T
): Partial<T> {
    const allowed = new Set(readableFields(policy, role));
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(row ?? {})) {
        if (allowed.has(k)) out[k] = v;
    }
    return out as Partial<T>;
}

/** Narrow a partial record (e.g., req.body) to only known policy fields (defense-in-depth). */
export function keepPolicyFields<Role extends string, T extends AnyRecord>(
    policy: Record<string, FieldPolicy<Role>>,
    data: T
): Partial<T> {
    const keys = new Set(Object.keys(policy));
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(data ?? {})) {
        if (keys.has(k)) out[k] = v;
    }
    return out as Partial<T>;
}
