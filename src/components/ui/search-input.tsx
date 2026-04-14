import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          ref={ref}
          type="text"
          className={`w-full rounded-lg border border-stone-300 py-2 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
