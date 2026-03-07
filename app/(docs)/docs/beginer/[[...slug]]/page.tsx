import { redirect } from "next/navigation"

// Redirect typo "beginer" to "beginner"
export default function BeginnerTypoRedirect() {
  redirect("/docs/beginner")
}
