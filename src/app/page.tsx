import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <p className="text-lg">Signed in as {user.email}</p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </div>
  );
}
