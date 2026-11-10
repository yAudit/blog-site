import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { GetStaticProps } from "next";
import Head from "next/head";
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
  const router = useRouter();

  const tags = useMemo(() => [...new Set(blogs.map((report) => report.tags).flat())], [blogs]);

  // The selected tags live in the URL (?tag=a,b), so a filtered list can be
  // shared and survives a reload. Unknown tags are ignored.
  const selectedTags = useMemo(() => {
    const param = router.query.tag;
    const raw = Array.isArray(param) ? param.join(",") : param ?? "";
    return raw
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tags.includes(tag));
  }, [router.query.tag, tags]);

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

  const handleTagSelection = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    router.replace(
      { pathname: router.pathname, query: newTags.length ? { tag: newTags.join(",") } : {} },
      undefined,
      { shallow: true, scroll: false }
    );
  };

  return (
    <>
      <Head>
        <title>yAudit Blog - Zero Knowledge & Smart Contract Security</title>
        <meta name="description" content="Expert insights on zero-knowledge proofs, smart contract security audits, blockchain vulnerabilities, and cutting-edge cryptography research from the yAudit security team." />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://blog.yaudit.dev" />
        <meta property="og:title" content="yAudit Blog - ZK & Smart Contract Security Research" />
        <meta property="og:description" content="Expert insights on zero-knowledge proofs, smart contract security audits, blockchain vulnerabilities, and cutting-edge cryptography research from the yAudit security team." />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://blog.yaudit.dev" />
        <meta name="twitter:title" content="yAudit Blog - ZK & Smart Contract Security Research" />
        <meta name="twitter:description" content="Expert insights on zero-knowledge proofs, smart contract security audits, blockchain vulnerabilities, and cutting-edge cryptography research from the yAudit security team." />
      </Head>

      <div className="min-h-screen bg-background">
        {/* The same side margins as the navbar (components/Navbar.tsx), so the
            search and the cards start under the logo and end under the
            Contact button. */}
        <main className="py-6 px-6 lg:px-[max(2rem,min(20vw,calc((100vw_-_1000px)/2)))]">
          <div className="mb-8 text-foreground/70">
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

        <div className="mt-8 grid gap-6 grid-cols-1">
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
    </>
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
