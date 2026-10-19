// The add/edit item actions' useActionState shape. In its own module so the
// client form can import the type without importing a "use server" file.
export type ItemFormState = { error: string } | null;
