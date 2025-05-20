import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <main className="flex justify-center mt-20">
        <Link href="/swap"><Button>Go to Swap</Button></Link>
      </main>
    </div>
  );
}
