import useReveal from '../hooks/useReveal'

// Drop-in scroll-reveal wrapper. `framer-motion` couldn't be installed here
// (the sandbox's npm registry access returned 403 on every package, not
// just this one) so this reproduces the same fade + rise + stagger effect
// with an IntersectionObserver and a plain CSS transition (see .reveal /
// .reveal-visible in index.css). Swappable for real framer-motion later
// with zero markup changes if registry access is restored — same prop shape
// (delay, as).
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...props }) {
  const [ref, visible] = useReveal()
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms`, ...props.style }}
      {...props}
    >
      {children}
    </Tag>
  )
}
