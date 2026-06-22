import { Download, ArrowRight } from 'lucide-react'
import './ThankYou.css'

export default function ThankYou() {
  return (
    <div className="ty">
      <div className="container ty-inner">

        <div className="ty-check">✓</div>

        <h1 className="ty-headline">You're in.</h1>
        <p className="ty-sub">
          Payment confirmed. Your FASS Masterclass Workbook is ready to download.
          Night 1 starts when you open it.
        </p>

        <a
          href="/fass-masterclass-workbook.pdf"
          download="FASS_Masterclass_Workbook.pdf"
          className="btn-primary ty-download"
        >
          <Download size={20} />
          Download your workbook
        </a>

        <div className="ty-next">
          <h2>What happens next</h2>
          <ol>
            <li>Download and read the workbook introduction before Night 1.</li>
            <li>You will receive a confirmation email at the address you provided.</li>
            <li>Session schedule and access details will follow from <a href="mailto:admin@fass.systems">admin@fass.systems</a>.</li>
          </ol>
        </div>

        <div className="ty-bd">
          <p>
            Ready to move beyond the Masterclass into active pursuit?
            The BD Partner Program is the next step.
          </p>
          <a href="mailto:admin@fass.systems?subject=BD Partner Program" className="ty-bd-link">
            Contact us about BD Partner support <ArrowRight size={14} />
          </a>
        </div>

      </div>
    </div>
  )
}
