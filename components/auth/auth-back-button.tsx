import Link from "next/link";

interface AuthBackButtonProps {
  label: string;
  href: string;
}

export const AuthBackButton = ({
  label,
  href
}: AuthBackButtonProps) => {
  return (
    <div className="text-center w-full">
      <Link
        href={href}
        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        {label}
      </Link>
    </div>
  );
};
