import React from "react";
import Link from "next/link";

interface BlogCardProps {
  title: string;
  subtitle: string;
  date: string;
  slug: string;
  tags: string[];
  author: string;
}

const ReportCard: React.FC<BlogCardProps> = ({
  title,
  subtitle,
  date,
  slug,
  tags,
  author,
}) => {
  // Format the date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      year: "numeric",
      month: "short",
    });
  };

  // const router = useRouter();

  return (
    <div
      className="bg-primary-foreground flex flex-row justify-between shadow hover:shadow-lg transition-shadow overflow-hidden hover:cursor-pointer"
      onClick={() => {
        // router.push(`/${slug}`)
        window.location.replace(`/${slug}`)
      }}
    >
      <div className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <Link href={`/${slug}`}>
            <h2 className="text-xl font-semibold text-title">{title}</h2>
          </Link>
        </div>
        <p className="text-body">{subtitle}</p>
      </div>
      <div className="p-8 flex flex-col md:hidden sm:hidden">
        <div className="flex flex-wrap gap-2 mb-3 flex-row-reverse">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium text-deepblue "
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm text-body text-right">
          {formatDate(date)} • {author}
        </p>
      </div>
    </div>
  );
};

export default ReportCard;
