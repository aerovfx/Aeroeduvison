"use client";

interface AuthMethodSelectorProps {
  selectedMethod: "jwt" | "firebase" | "aws";
  onMethodChange: (method: "jwt" | "firebase" | "aws") => void;
}

export const AuthMethodSelector = ({ selectedMethod, onMethodChange }: AuthMethodSelectorProps) => {
  const methods = [
    {
      id: "jwt" as const,
      name: "JWT",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ),
      color: "text-blue-600"
    },
    {
      id: "firebase" as const,
      name: "Firebase",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.89 15.673L6.255.461A.542.542 0 017.27.288L2.377 2.3a.543.543 0 00-.35.51v12.863zm2.544-14.867L8.72 19.677l-2.818-4.004zm11.428.032L18.837 3.45a.543.543 0 00-.214-.417L12.327.288a.543.543 0 00-.63.055L3.89 15.673l4.213 5.98a.543.543 0 00.917-.005l10.016-17.12a.543.543 0 00-.064-.63z"/>
        </svg>
      ),
      color: "text-orange-500"
    },
    {
      id: "aws" as const,
      name: "AWS",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.763 12.616c-.186-.13-.42-.2-.68-.2-.26 0-.494.07-.68.2-.186.13-.28.32-.28.57 0 .25.094.44.28.57.186.13.42.2.68.2.26 0 .494-.07.68-.2.186-.13.28-.32.28-.57 0-.25-.094-.44-.28-.57zm2.38-1.8c-.28-.2-.65-.3-1.1-.3-.45 0-.82.1-1.1.3-.28.2-.42.5-.42.9 0 .4.14.7.42.9.28.2.65.3 1.1.3.45 0 .82-.1 1.1-.3.28-.2.42-.5.42-.9 0-.4-.14-.7-.42-.9z"/>
        </svg>
      ),
      color: "text-yellow-500"
    }
  ];

  return (
    <div className="flex space-x-2">
      {methods.map((method) => (
        <button
          key={method.id}
          onClick={() => onMethodChange(method.id)}
          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
            selectedMethod === method.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className={`mb-2 ${method.color}`}>
            {method.icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{method.name}</span>
        </button>
      ))}
    </div>
  );
};
