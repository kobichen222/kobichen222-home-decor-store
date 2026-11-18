import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Breadcrumbs, JsonLd } from "@/components/store/page-header";
import { RichText } from "@/components/store/rich-text";
import { getBlogPost, getBlogPosts } from "@/features/cms/queries";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  // At least one param is required for the route to prerender its shell.
  return posts.length ? posts.slice(0, 30).map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post) return {};
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, images: post.cover_image_url ? [post.cover_image_url] : undefined },
  };
}

async function Post({ params }: PageProps<"/blog/[slug]">) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="container-page max-w-3xl py-8 lg:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          datePublished: post.published_at,
          image: post.cover_image_url ? [post.cover_image_url.startsWith("http") ? post.cover_image_url : siteUrl() + post.cover_image_url] : undefined,
          mainEntityOfPage: `${siteUrl()}/blog/${post.slug}`,
        }}
      />
      <Breadcrumbs items={[{ name: "בלוג", href: "/blog" }, { name: post.title, href: `/blog/${post.slug}` }]} />
      <p className="mt-6 text-sm text-ink-soft">
        {post.category?.name && `${post.category.name} · `}
        {post.published_at && formatDate(post.published_at)}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-[2.6rem]">{post.title}</h1>
      {post.excerpt && <p className="mt-4 text-xl text-ink-soft">{post.excerpt}</p>}
      {post.cover_image_url && (
        <div className="relative mt-8 aspect-[3/2] overflow-hidden rounded-2xl bg-sand">
          <StoreImage src={post.cover_image_url} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}
      {post.body && <RichText text={post.body} className="mt-8 space-y-5 text-lg leading-relaxed" />}
      {post.tags.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2" aria-label="תגיות">
          {post.tags.map((t) => <li key={t} className="rounded-full bg-sand px-3 py-1 text-sm">#{t}</li>)}
        </ul>
      )}
    </article>
  );
}

export default function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page max-w-3xl py-12"><div className="h-80 animate-pulse rounded-2xl bg-sand" /></div>}>
      <Post {...props} />
    </Suspense>
  );
}
