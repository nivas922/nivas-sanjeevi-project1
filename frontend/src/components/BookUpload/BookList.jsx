import React from "react";
import { Book, FileText, ArrowRight } from "lucide-react";

export const BookList = ({ books = [], onSelectBook }) => {
  if (books.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No textbooks uploaded yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {books.map((book) => (
        <div
          key={book.id}
          onClick={() => onSelectBook && onSelectBook(book)}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-brand-400 shadow-soft-sm transition-all cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Book className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
              {book.title}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{book.subject || "Academic Material"}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
export default BookList;
