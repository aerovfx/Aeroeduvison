import Link from "next/link";

interface AuthBackButtonProps {
  label: string;
  href: string;
}

export const AuthBackButton = ({ label, href }: AuthBackButtonProps) => {
  return (
    <div className="w-full text-center">
      <Link
        href={href}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
      </Link>
    </div>
  );
};
