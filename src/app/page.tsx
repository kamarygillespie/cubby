import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { listItems } from "@/lib/db/items";
import { ItemsList } from "./items-list";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const items = await listItems(supabase);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Signed in as {user.email}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/items/new"
            className={buttonVariants({ variant: "default" })}
          >
            Add item
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </div>
      <ItemsList items={items} />
    </div>
  );
}
