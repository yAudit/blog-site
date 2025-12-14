import { useState, useMemo, useEffect } from "react";
import { GetStaticProps } from "next";
import SearchBar from "../components/SearchBar";
import ReportCard from "../components/BlogCard";
import matter from "gray-matter";
import path from "path";
import fs from "fs";

interface Blog {
  title: string;
  subtitle: string;
  date: string;
  slug: string;
  author: string;
  tags: string[];
}

interface HomeProps {
  blogs: Blog[];
}

export default function Home({ blogs }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const tags = useMemo(() => [...new Set(blogs.map((report) => report.tags).flat())], [blogs]);

  // Enhanced useEffect to handle multiple URL tags
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get("tag");

    if (tagParam) {
      // Split the tag parameter by commas and filter out any invalid tags
      const urlTags = tagParam
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tags.includes(tag));

      if (urlTags.length > 0) {
        setSelectedTags(urlTags);
      }
    }
  }, [tags]);

  const filteredBlogs = useMemo(() => {
    const query = searchQuery?.toLowerCase();
    return blogs
      .filter(
        (blog) =>
          blog?.title?.toLowerCase().includes(query) ||
          blog?.subtitle?.toLowerCase().includes(query) ||
          blog?.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
      .filter((blog) => {
        if (selectedTags.length === 0) return true;
        return blog.tags.some((tag) => selectedTags.includes(tag));
      });
  }, [searchQuery, blogs, selectedTags]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Enhanced tag selection handler for multiple tags
  const handleTagSelection = (tag: string) => {
    setSelectedTags((prevTags) => {
      const newTags = prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag];

      // Update URL with all selected tags
      const params = new URLSearchParams(window.location.search);
      if (newTags.length > 0) {
        params.set("tag", newTags.join(","));
      } else {
        params.delete("tag");
      }

      // Update URL without refreshing the page
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${
          newTags.length ? `?${params.toString()}` : ""
        }`
      );

      return newTags;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 mb-8 text-foreground/70">
          <SearchBar onSearch={handleSearch} />
          <div className="flex flex-wrap gap-2 mx-auto mt-4 justify-center">
            {tags.map((tag, index) => (
              <button
                key={index}
                className={
                  `inline-flex items-center px-2.5 py-0.5 text-md sm:text-sm font-medium dark:text-white text-zinc-400 hover:text-deepblue dark:hover:text-deepblue transition-all duration-700`
                }
                onClick={() => handleTagSelection(tag)}
              >
                {tag} {selectedTags.includes(tag) && "x"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 px-4 sm:px-0 grid-cols-1">
          {filteredBlogs.length > 0 ? (
            filteredBlogs.map((report, index) => (
              <ReportCard key={index} {...report} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-foreground/60">
                {searchQuery
                  ? "No blogs found matching your search."
                  : "No blogs available."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const blogsDirectory = path.join(process.cwd(), "content");
    const filenames = fs.readdirSync(blogsDirectory);

    const blogs = filenames
      .filter((filename) => filename.endsWith(".md"))
      .map((filename) => {
        const filePath = path.join(blogsDirectory, filename);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const { data: frontmatter } = matter(fileContent);

        return {
          slug: filename.replace(".md", ""),
          title: frontmatter.title,
          date:
            new Date(frontmatter.date).toISOString() ||
            new Date().toISOString(),
          subtitle: frontmatter.subtitle || null,
          tags: frontmatter.tags || [],
          author: frontmatter.author || "Anonymous",
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    return {
      props: {
        blogs,
      },
      // Revalidate every hour
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return {
      props: {
        blogs: [],
      },
      revalidate: 3600,
    };
  }
};
