import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import path from "path";
import fs from "fs";
import { processMarkdown } from "../lib/utils";
import Link from "next/link";

interface ReportPageProps {
  title: string;
  content: string;
  date: string;
  tags: string[];
  author: string;
  twitter: string;
  subtitle?: string;
  slug: string;
}

export default function ReportPage({
  title,
  content,
  date,
  tags,
  author,
  twitter,
  subtitle,
  slug
}: ReportPageProps) {
  // Optimize title for social media (max 60 chars for optimal display)
  const ogTitle = title.length > 60 ? `${title.substring(0, 57)}...` : title;

  // Optimize description for social media (150-160 chars ideal)
  const ogDescription = subtitle
    ? subtitle.length > 160
      ? `${subtitle.substring(0, 157)}...`
      : subtitle
    : `Read about ${tags.join(", ")} on the yAudit blog. By ${author}.`;

  const pageUrl = `https://blog.yaudit.dev/${slug}`;
  const ogImage = "https://blog.yaudit.dev/twitter.png";

  return (
    <>
      <Head>
        <title>{title} | yAudit Blog</title>
        <meta name="description" content={ogDescription} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${title} - yAudit Blog`} />
        <meta property="article:published_time" content={date} />
        <meta property="article:author" content={author} />
        {tags.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={`${title} - yAudit Blog`} />
        <meta name="twitter:creator" content="@yaudit" />
      </Head>

      <main className="min-h-screen bg-background">
        <article className="max-w-6xl mx-auto px-4 py-10">
          <Link href="/" className="inline-block mb-4">
            <h2 className="text-xl text-title">← Back to Blogs</h2>
          </Link>

        <div className="bg-primary-foreground shadow p-6 sm:px-6 ">
          <header className="flex lg:flex-row md:flex-row flex-col justify-between lg:items-center md:items-center gap-2 items-left mb-6 text-body">
            <span>By <a href={twitter} target="_blank" className="font-semibold text-button hover:underline">{author}</a></span>
            <span>
              {new Date(date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emeraldlight bg-opacity-20 text-button"
                >
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <div
            className="prose prose-lg max-w-none prose-table:shadow-lg prose-table:border prose-td:p-2 prose-th:p-2 prose-a:text-title"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </article>
    </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const blogsDirectory = path.join(process.cwd(), "content");
  const filenames = fs.readdirSync(blogsDirectory);

  const paths = filenames
    .filter((file): file is NonNullable<typeof file> => file !== null)
    .map((file) => ({
      params: { slug: file.replace(".md", "") },
    }));

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  try {
    const slug = params?.slug as string;
    const blogsDirectory = path.join(process.cwd(), "content");
    const filePath = path.join(blogsDirectory, `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { frontMatter, content } = await processMarkdown(fileContent);

    return {
      props: {
        title: frontMatter.title,
        content: content || "",
        date: new Date(frontMatter.date).toISOString(),
        tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
        author: frontMatter.author || "Anonymous",
        twitter: frontMatter.twitter || "",
        subtitle: frontMatter.subtitle || "",
        slug: slug,
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error("Error fetching report:", error);
    return {
      notFound: true,
    };
  }
};
