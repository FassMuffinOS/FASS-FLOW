import './ScribeEmbed.css'

// Reusable Scribe walkthrough embed. Scribe iframes stay in sync with the
// source guide automatically — update the Scribe, every embed updates. Pass
// the /embed/ URL from Scribe's "Embed" share option.
export default function ScribeEmbed({ src, title = 'FASS Flow guide', minHeight = 480 }) {
  if (!src) return null
  return (
    <div className="scribe-embed">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="fullscreen"
        allowFullScreen
        style={{ minHeight }}
      />
    </div>
  )
}
