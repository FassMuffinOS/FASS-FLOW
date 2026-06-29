import { useState } from 'react'
import { Calendar, ArrowRight, ArrowLeft } from 'lucide-react'
import Reveal from '../components/Reveal'
import useSeo from '../hooks/useSeo'
import './Blog.css'

// Three real launch posts — company story + two practical GovCon tips, the
// same voice as Careers/About. Single route, no per-post slugs yet: posts
// expand in place rather than navigating away, which keeps this shippable
// without adding new App.jsx routes for every article.
const POSTS = [
  {
    slug: 'why-were-building-fass-flow',
    title: "Why We're Building FASS Flow",
    date: 'June 2026',
    excerpt: "Government contracting is full of friction that has nothing to do with doing good work. Here's why we started fixing it.",
    body: [
      "Every small business we talked to had some version of the same story: they could do the work, but everything around the work — finding the right contract, deciding whether to bid, writing the proposal, staying compliant, getting paid — was eating days they didn't have.",
      "Most of the tooling built for government contracting assumes you have a procurement team, a compliance officer, and a proposal writer on staff. A five-person crew doesn't have any of that. They have someone doing all three jobs between actual client work, usually at night.",
      "FASS Flow exists to close that gap. WARDOG finds the contracts worth your time. R-E-A-D tells you honestly whether a bid is winnable before you spend a week on it. FASS FILL cuts the compliance and proposal work from weeks to hours. Witness runs the job from award to closeout. It's one platform instead of six disconnected tools and a folder of templates.",
      "We're a small team building against a real, live customer base — which means the roadmap changes based on what actually breaks for actual businesses, not based on a feature wishlist. If that's a problem worth your time too, we're hiring (see our Careers page).",
    ],
  },
  {
    slug: 'bid-or-no-bid-how-read-scores-a-contract',
    title: 'Bid or No-Bid: How R-E-A-D Actually Scores a Contract',
    date: 'June 2026',
    excerpt: 'Deciding whether to bid is usually a guess. Here is the six-question framework R-E-A-D uses to turn it into a real signal.',
    body: [
      "The most expensive mistake in government contracting isn't losing a bid — it's spending a week writing a proposal for a contract you never had a real shot at winning.",
      "R-E-A-D (our bid/no-bid tool) runs every opportunity through six questions before you write a single word of a proposal: Do you meet the actual eligibility requirements? Is the timeline realistic for your team? Have you (or someone like you) done this scope before? Is the contract value worth the proposal effort? Is the competitive field something you can realistically beat? And is this the right fit strategically, not just financially?",
      "None of these require a crystal ball — they require being honest with yourself before you're three days into a proposal and emotionally invested in finishing it. The businesses that win consistently aren't the ones who bid on everything; they're the ones who say no early and often, so the bids they do write get real attention.",
      "If you're doing this bid/no-bid call from memory or gut feel right now, it's worth writing the six questions down somewhere you'll actually look at them before you commit to a proposal.",
    ],
  },
  {
    slug: '5-things-small-businesses-get-wrong-about-samgov',
    title: '5 Things Most Small Businesses Get Wrong About SAM.gov',
    date: 'June 2026',
    excerpt: 'SAM.gov is the front door to federal contracting — and most small businesses are using it in a way that costs them real opportunities.',
    body: [
      "1. Treating registration as a one-time task. Your SAM.gov registration expires every year, and a lapsed registration makes you invisible to contracting officers and ineligible for award — even mid-bid. Calendar the renewal.",
      "2. Searching with too few NAICS codes. Most businesses register under one or two codes and miss adjacent work they're fully qualified to bid on. If your business does the work, the code should be on your profile.",
      "3. Ignoring set-aside designations that actually apply to them. Small business, HUBZone, WOSB, SDVOSB, 8(a) — these aren't paperwork, they're real competitive advantages that filter out a huge slice of the competition. Most businesses that qualify for one don't have it marked correctly.",
      "4. Reading only the title and skipping the actual solicitation document. The juicy details — real scope, real deadlines, real evaluation criteria — are almost always buried in an attached PDF, not the listing itself.",
      "5. Checking SAM.gov manually, occasionally. New solicitations post daily, and the best opportunities get the most competition the longer they sit. A live feed beats a Tuesday-afternoon manual search every time — which is the entire reason WARDOG exists.",
    ],
  },
]

export default function Blog() {
  const [openSlug, setOpenSlug] = useState(null)
  const openPost = POSTS.find(p => p.slug === openSlug)

  useSeo(
    openPost
      ? {
          title: openPost.title,
          description: openPost.excerpt,
          path: `/blog#${openPost.slug}`,
          markdownUrl: `/llms/blog/${openPost.slug}.md`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: openPost.title,
            datePublished: openPost.date,
            description: openPost.excerpt,
            author: { '@type': 'Organization', name: 'FASS Technologies LLC' },
          },
        }
      : {
          title: 'Blog',
          description: 'Company updates and practical government contracting tips from the team building FASS Flow.',
          path: '/blog',
          markdownUrl: '/llms/blog.md',
        }
  )

  if (openPost) {
    return (
      <div className="blog">
        <section className="blog-post-section">
          <div className="container blog-post-container">
            <button className="blog-back" onClick={() => setOpenSlug(null)}>
              <ArrowLeft size={15} /> Back to all posts
            </button>
            <Reveal as="div">
              <span className="blog-post-date"><Calendar size={13} /> {openPost.date}</span>
              <h1 className="blog-post-title">{openPost.title}</h1>
              {openPost.body.map((para, i) => (
                <p className="blog-post-para" key={i}>{para}</p>
              ))}
            </Reveal>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="blog">
      <section className="blog-hero">
        <div className="container">
          <Reveal as="div" className="blog-hero-inner">
            <span className="section-label">Blog</span>
            <h1 className="blog-title">Notes on Building FASS Flow</h1>
            <p className="blog-sub">
              Company updates and practical government contracting tips from the team building the platform.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="blog-section">
        <div className="container">
          <div className="blog-grid">
            {POSTS.map((p, i) => (
              <Reveal as="article" key={p.slug} className="blog-card" delay={i * 70}>
                <span className="blog-card-date"><Calendar size={13} /> {p.date}</span>
                <h2 className="blog-card-title">{p.title}</h2>
                <p className="blog-card-excerpt">{p.excerpt}</p>
                <button className="blog-card-link" onClick={() => setOpenSlug(p.slug)}>
                  Read more <ArrowRight size={14} />
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
