/**
 * Optional fake clock for reproducible demo data and screenshots.
 *
 *   DEMO_CLOCK=2026-10-20T16:40:00Z NODE_OPTIONS="--require ./scripts/demo-clock.cjs" <command>
 *
 * Shifts Date (new Date(), Date.now()) so the process starts at DEMO_CLOCK and
 * time keeps running from there. Used for `npm run seed:demo` and `next start`
 * when taking screenshots, so the floor plan and reservation list look like a
 * normal evening service whatever the real time is. Never loaded otherwise.
 */
const target = process.env.DEMO_CLOCK
if (target) {
  const offset = Date.parse(target) - Date.now()
  if (Number.isNaN(offset)) throw new Error(`DEMO_CLOCK is not a valid date: ${target}`)
  const RealDate = Date
  // A plain constructor sharing Date.prototype (instanceof keeps working),
  // with every static copied explicitly: some bundled code reads Date.UTC /
  // Date.parse in ways that miss statics inherited through a subclass.
  function DemoDate(...args) {
    if (!new.target) return new RealDate(RealDate.now() + offset).toString()
    return args.length === 0 ? new RealDate(RealDate.now() + offset) : new RealDate(...args)
  }
  DemoDate.prototype = RealDate.prototype
  DemoDate.now = () => RealDate.now() + offset
  DemoDate.parse = RealDate.parse
  DemoDate.UTC = RealDate.UTC
  globalThis.Date = DemoDate
}
