// app/(actions)/leaseActions.ts
"use server";

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogSchema } from "@/lib/table/configs/log";
import { revalidatePath } from "next/cache";

export async function onCreate(agentId: string, form: FormData) {
  const user = await getUser();
  console.log(user?.id)

  // TODO: VALIDATE REQUEST ARE LEGIT!!!
  if (!user) return { ok: false, message: "Not legit" } as const;

  form.set("userId", user.id);

  const data = Object.fromEntries(form) as any;
  const parsed = LogSchema.omit({ id: true, createdAt: true }).parse(data);

  await prisma.lease.create({
    data: {
      ...parsed,
      moveInDate: new Date(parsed.moveInDate),
      userId: agentId
    },
  });

  revalidatePath(`/agent/${agentId}/leases`);
  return { ok: true, message: "Created" } as const;
}

export async function onUpdate(agentId: string, id: string, form: FormData) {
  const raw = Object.fromEntries(form) as any;
  const parsed = LogSchema.partial().parse(raw);

  await prisma.lease.update({
    where: { id },
    data: {
      ...parsed,
      ...(parsed.moveInDate ? { moveInDate: new Date(parsed.moveInDate) } : {}),
    },
  });

  revalidatePath(`/agent/${agentId}/leases`);
  return { ok: true, message: "Updated" } as const;
}

export async function onDelete(agentId: string, id: string) {
  await prisma.lease.delete({ where: { id } });

  revalidatePath(`/agent/${agentId}/leases`);
  return { ok: true, message: "Deleted" } as const;
}
