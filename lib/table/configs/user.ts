import { z } from "zod";
import type { ColumnDef, TableConfig } from "../types";

export const UserSchema = z.object({
    id: z.uuid(),
    fname: z.string().min(1, "First name is required"),
    lname: z.string().min(1, "Last name is required"),
    email: z.email().nullable().optional(),
    phone: z.string().regex(/^\d+$/, "Phone must contain only numbers").or(z.string().length(0)).optional(),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    permissions: z.enum(["owner", "agent"]).default("agent"),
    isDeleted: z.boolean().default(false),
    createdAt: z.iso.datetime().optional(),
})
    .strict();

export type UserRow = z.infer<typeof UserSchema>;

export const userColumns: ColumnDef<UserRow>[] = [
    {
        key: "fname",
        label: "First Name",
        input: "text",
        editableBy: ["owner"],
        required: true,
        placeholder: "Enter first name",
    },
    {
        key: "lname",
        label: "Last Name",
        input: "text",
        editableBy: ["owner"],
        required: true,
        placeholder: "Enter last name",
    },
    {
        key: "email",
        label: "Email",
        input: "text",
        editableBy: ["owner"],
        placeholder: "Enter email address",
    },
    {
        key: "phone",
        label: "Phone",
        input: "number",
        editableBy: ["owner"],
        placeholder: "Enter phone number",
    },
    {
        key: "username",
        label: "Username",
        input: "text",
        editableBy: ["owner"],
        required: true,
        placeholder: "Enter username",
    },
    {
        key: "password",
        label: "Password",
        input: "text",
        editableBy: ["owner"],
        required: true,
        placeholder: "Enter password",
    },
    {
        key: "permissions",
        label: "Permissions",
        input: "select",
        editableBy: ["owner"],
        options: [
            { value: "owner", label: "Owner" },
            { value: "agent", label: "Agent" },
        ],
    },
];

export const userTableConfig: TableConfig<UserRow> = {
    id: "users",
    schema: UserSchema,
    columns: userColumns,
};
