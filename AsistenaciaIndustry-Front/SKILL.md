---
name: integro-brand-frontend
description: Brand-specific frontend design and implementation rules for Íntegro websites, web applications, dashboards, landing pages, and redesigns. Enforces the official black, gray, light-gray, red palette, Montserrat typography, bold editorial layouts, accessible interaction patterns, responsive behavior, and production-ready engineering.
---

# Íntegro Brand Frontend Skill

> Use this skill to design or implement any frontend that represents Íntegro.
>
> This is a brand-specific companion to `design-taste-frontend`. It converts the supplied Íntegro brand guidelines into concrete UI, UX, responsive, accessibility, and engineering rules.
>
> Inspired by the structure and anti-template principles of Taste Skill by Leonxlnx, distributed under the MIT License:
> https://github.com/Leonxlnx/taste-skill

## 0. Scope, activation, and precedence

Apply this skill to:

- Marketing websites and landing pages
- Corporate websites
- Product websites
- Internal web applications
- Dashboards and reporting interfaces
- Portals, forms, and authenticated product surfaces
- Existing Íntegro frontend redesigns
- Presentation-like web experiences
- Reusable design-system components

Do not apply the visual rules blindly to:

- Third-party embedded products whose design system cannot be changed
- Native mobile interfaces governed by Apple HIG or Material Design
- White-label products where another client's brand must take precedence
- Legal documents or operational screens that explicitly require another visual standard

### 0.1 Precedence order

When instructions conflict, use this order:

1. Accessibility, legal, security, and functional requirements
2. Explicit user requirements
3. Existing project architecture and product behavior
4. Íntegro brand rules in this skill
5. General advice from companion design skills
6. Agent preferences

When this skill is loaded with Taste Skill:

- Íntegro colors override generic palette recommendations.
- Montserrat overrides generic font recommendations.
- The red terminal period is an approved brand signature.
- Íntegro's split editorial compositions are allowed when used deliberately.
- Taste Skill still governs anti-template quality, accessibility, performance, complete states, and production readiness.

### 0.2 Preserve the existing stack

Do not migrate frameworks merely to satisfy this skill.

- React stays React.
- Vue stays Vue.
- Nuxt stays Nuxt.
- Astro stays Astro.
- Laravel Blade stays Blade.
- Existing Tailwind, CSS Modules, Sass, or component-library conventions remain unless the user requests a migration.

Build the brand system using the project's native conventions.

---

## 1. Required design read

Before editing code, inspect the brief, references, repository, and existing UI.

Output one concise line before implementation:

> Reading this as: `<surface type>` for `<audience>`, using Íntegro's `<dominant visual mode>` with `<layout character>` and `<motion level>`.

Examples:

- Reading this as: a corporate landing page for commercial partners, using Íntegro's black-dominant visual mode with asymmetric editorial sections and restrained motion.
- Reading this as: an internal operations dashboard, using Íntegro's light functional mode with dense information, sharp hierarchy, and minimal motion.
- Reading this as: a campaign microsite for a new development, using Íntegro's high-expression mode with bold typography, architectural imagery, and controlled red accents.

If a redesign request is unclear, ask one question:

> Should this preserve the current information architecture and behavior, or is a full visual and structural overhaul approved?

Do not ask a long questionnaire when the available references already establish the direction.

---

## 2. Design dials

Use the same three dial names as Taste Skill.

### 2.1 Default brand setting

```text
DESIGN_VARIANCE: 7
MOTION_INTENSITY: 4
VISUAL_DENSITY: 4
```

This creates a bold, modern, and recognizable layout without becoming chaotic or theatrical.

### 2.2 Presets

| Surface | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---|---:|---:|---:|
| Corporate marketing site | 7 | 4 | 3 |
| Campaign or launch page | 8 | 6 | 3 |
| Property or project showcase | 7 | 5 | 4 |
| Corporate portal | 5 | 3 | 6 |
| Dashboard or analytics | 4 | 2 | 8 |
| Form-heavy workflow | 4 | 2 | 6 |
| Existing redesign, preserve mode | Match current, then +1 | Match current | Match current |
| Existing redesign, overhaul mode | 7 | 4 | Match content needs |

### 2.3 Dial interpretation

- Higher `DESIGN_VARIANCE` means more asymmetric columns, large type, intentional negative space, and mixed section proportions.
- Higher `MOTION_INTENSITY` means more sequencing and scroll storytelling, not more decorative animation.
- Higher `VISUAL_DENSITY` means tighter spacing and more visible data, not more cards.

For screens with important operational data, lower visual experimentation before reducing readability.

---

## 3. Brand personality

Every design decision should support these qualities:

- Dynamic
- Extroverted
- Creative
- Surprising
- Innovative
- Original
- Distinct
- Elegant
- Modern

The brand should communicate:

- Trust
- Positive impact
- Creative thinking

### 3.1 Translation into interface behavior

| Brand quality | UI expression |
|---|---|
| Dynamic | Strong visual rhythm, directional composition, purposeful transitions |
| Extroverted | Confident headings, bold contrast, direct calls to action |
| Creative | Unexpected but usable layout proportions, editorial image treatment |
| Surprising | One memorable compositional move per page |
| Innovative | Contemporary interaction and clean technical execution |
| Original | Avoid generic SaaS templates and copied component arrangements |
| Distinct | Consistent use of the red period, strong black fields, and Montserrat |
| Elegant | Restraint, alignment, generous spacing, limited decoration |
| Modern | Responsive typography, precise grid systems, optimized media |
| Trust | Clear hierarchy, readable copy, visible states, predictable behavior |
| Positive impact | Human outcomes, real spaces, real projects, useful metrics |
| Creative thinking | Content-led layouts that adapt to the message |

### 3.2 One memorable move per page

Choose one primary signature treatment:

- A bold asymmetric hero
- An oversized typographic statement
- A controlled black-to-light section transition
- A large architectural image crop
- A red line or terminal period used as a narrative anchor
- A single scroll-pinned story sequence
- A distinctive project grid

Do not combine every treatment on the same page.

---

## 4. Official color system

### 4.1 Core palette

| Token | Hex | RGB | Intended role |
|---|---|---|---|
| Brand Black | `#000000` | `0, 0, 0` | Dominant brand field, text, navigation, major surfaces |
| Brand Gray | `#89888A` | `137, 136, 138` | Secondary surfaces, diagrams, large labels, non-text decoration |
| Brand Light Gray | `#E1E2E4` | `225, 226, 228` | Soft surfaces, separators, table bands, disabled backgrounds |
| Brand Red | `#C3302D` | `195, 48, 45` | Accent, focus, primary CTA, terminal period, selected emphasis |
| White | `#FFFFFF` | `255, 255, 255` | Negative space, inverse text, clean informational surfaces |

### 4.2 Target visual balance

Use the source brand guide as a composition heuristic:

- Black: approximately 50%
- Brand Gray: approximately 20%
- Brand Light Gray: approximately 20%
- Brand Red: approximately 10%

These percentages are not per-component quotas. Evaluate the whole visible composition.

White acts as negative space and a neutral canvas. It may occupy more of an information-heavy page when readability requires it.

### 4.3 Red usage

Brand Red is a high-value accent. Use it for:

- The period at the end of major headings
- One primary CTA
- Focus outlines
- Active navigation states
- Key numeric highlights
- Important dividers or progress markers
- Critical status, when the product context requires red to mean danger

Do not use red for:

- Large paragraphs
- Every icon
- Every hover state
- Full-page backgrounds by default
- Decorative dots throughout a layout
- Multiple competing CTA groups
- Neutral selection and error meaning in the same view

### 4.4 Semantic conflict rule

In marketing surfaces, red may mean brand emphasis.

In operational products, semantic meaning wins:

- If red means error, danger, or overdue, do not also use red for neutral row selection.
- Use black, a border, or light gray for neutral selection.
- Keep success and warning colors functional, limited, and visually subordinate to the brand palette.
- Never recolor semantic feedback merely to force every state into the brand palette.

### 4.5 Accessible color combinations

Use these verified combinations:

| Foreground | Background | Approx. contrast | Use |
|---|---|---:|---|
| White | Black | 21.0:1 | Any text |
| Black | White | 21.0:1 | Any text |
| White | Brand Red | 5.55:1 | Buttons and normal text |
| Brand Red | White | 5.55:1 | Normal text and emphasis |
| Black | Brand Gray | 5.95:1 | Normal text |
| Brand Gray | Black | 5.95:1 | Normal text |
| Black | Brand Light Gray | 16.2:1 | Any text |
| Brand Gray | White | 3.53:1 | Large text only, not normal body text |

For muted body text on white, use the accessible derived neutral:

```css
--integro-gray-text: #747376;
```

It preserves the brand-gray character while reaching approximately 4.71:1 against white.

### 4.6 Color prohibitions

- Do not add purple, cyan, neon blue, gold, beige, or pastel accent families without a project-specific brand extension.
- Do not use rainbow gradients.
- Do not use blue-purple AI glows.
- Do not mix warm and cool gray systems.
- Do not create multiple shades that are visually indistinguishable.
- Do not place white small text on Brand Gray.
- Do not place black normal-size text on Brand Red. Use white.
- Do not lower opacity on text until contrast fails.

---

## 5. Typography

### 5.1 Primary typeface

Use Montserrat as the default typeface for all branded interfaces.

Preferred weights:

- 700 for display headings and primary labels
- 600 for buttons, navigation, and UI emphasis
- 400 for body copy
- 300 only for large display copy or secondary editorial text when contrast and rendering remain strong

Do not load unnecessary weights.

### 5.2 Secondary typeface

Helvetica is the secondary fallback when Montserrat is not available.

Recommended system stack:

```css
font-family:
  "Montserrat",
  "Helvetica Neue",
  Helvetica,
  Arial,
  sans-serif;
```

The source brand guide treats Helvetica as a substitute, not a pairing.

Do not deliberately mix Montserrat and Helvetica in the same interface.

### 5.3 Font delivery

- Self-host approved font files or use the framework's optimized font pipeline.
- Use `font-display: swap`.
- Preload only the weights required above the fold.
- Subset by language when the deployment pipeline supports it.
- Do not expose or redistribute licensed font files that are not approved for redistribution.

### 5.4 Responsive type scale

The brand guide's 48 pt, 18 pt, and 14 pt samples define hierarchy, not fixed browser pixels.

Use this responsive interpretation:

```css
--type-display-xl: clamp(3.5rem, 7.5vw, 7rem);
--type-display: clamp(2.75rem, 5.5vw, 5.5rem);
--type-h1: clamp(2.5rem, 4.5vw, 4.75rem);
--type-h2: clamp(2rem, 3.5vw, 3.75rem);
--type-h3: clamp(1.25rem, 2vw, 1.75rem);
--type-body-lg: clamp(1.05rem, 1.2vw, 1.25rem);
--type-body: 1rem;
--type-small: 0.875rem;
```

### 5.5 Type behavior

Display headings:

- Montserrat Bold
- Tight tracking, usually `-0.03em` to `-0.05em`
- Line height from `0.95` to `1.05`
- Left aligned by default
- Maximum 2 to 3 lines on desktop
- Use the red terminal period on selected major headings

Body copy:

- Montserrat Regular
- Line height from `1.5` to `1.7`
- Maximum readable width of `60ch` to `70ch`
- Avoid fully justified text on the web
- Never use Brand Gray for normal body text on white

UI text:

- Use 14 px to 16 px for controls
- Use 600 weight for buttons and active navigation
- Do not use all caps for long labels
- Keep tracking near normal for small text

### 5.6 The red terminal period

The red period is an approved signature.

Use it:

- On the primary page heading
- On a major manifesto heading
- On one or two high-value section headings
- When the copy naturally ends with a decisive statement

Do not use it:

- On every heading
- On body paragraphs
- As a separate floating dot
- On button labels
- On form labels
- On repeated card titles

Recommended markup:

```html
<h1 class="display-heading">
  Creamos lugares que dejan huella<span
    class="brand-period"
    aria-hidden="true"
  >.</span>
</h1>
```

Recommended CSS:

```css
.brand-period {
  color: var(--integro-red);
}
```

### 5.7 Typography prohibitions

- No serif fonts unless a sub-brand explicitly requires one.
- No mixed-font headline gimmicks.
- No random italic word inserted only to look editorial.
- No ultra-light body text.
- No condensed type for paragraphs.
- No oversized heading that creates four or more desktop lines.
- No decorative letter spacing that harms Spanish accents or legibility.
- No replacing Montserrat with Inter as a convenience.

---

## 6. Grid, spacing, and composition

### 6.1 Base grid

Use a 12-column desktop grid.

Recommended container:

```css
width: min(100% - 2rem, 90rem);
margin-inline: auto;
```

Recommended page gutters:

- Mobile: 16 to 20 px
- Small tablet: 24 px
- Large tablet: 32 px
- Desktop: 48 to 72 px
- Large desktop: up to 96 px when the composition benefits

### 6.2 Section rhythm

Marketing pages:

- Compact section: 64 to 80 px vertical
- Standard section: 96 to 128 px vertical
- Major statement section: 128 to 192 px vertical

Product surfaces:

- Page header: 24 to 40 px
- Content groups: 24 to 48 px
- Dense dashboard groups: 16 to 32 px

Do not use the same vertical padding for every section.

### 6.3 Preferred compositions

Use:

- 5/7 or 4/8 editorial splits
- Large left-aligned headings with a carefully aligned text column
- Full-width black statement sections
- Full-bleed architectural or project imagery
- Asymmetric media grids
- Strong empty zones
- Thin functional rules
- Alternating content scale, not mechanical zigzags
- Overlapping type and media only when readability remains intact

Avoid:

- Three equal feature cards
- Repeated 50/50 image-text rows
- Centered hero plus three cards plus testimonials plus CTA template
- Card grids for content that can be structured with spacing
- Random floating elements
- Excessive pill-shaped components
- Repeated eyebrow labels over every section

### 6.4 Approved split-header override

The supplied brand references use a large heading on the left and explanatory copy on the right.

This is an approved Íntegro signature when:

- Both columns align to the same grid.
- The right copy begins near the heading's first or second line.
- The copy has a clear maximum width.
- The composition appears no more than twice on a typical page.
- The right side contains meaningful copy, not filler.

Do not place a tiny paragraph in a distant top-right corner without alignment.

### 6.5 Shape system

Default geometry:

```text
Cards and content surfaces: 0 to 4 px radius
Inputs: 0 to 4 px radius
Buttons: 0 to 4 px radius
Tags and status chips: full pill only when the shape conveys a compact token
```

The brand is sharp and editorial. Do not soften the entire interface into rounded SaaS cards.

### 6.6 Borders and shadows

- Prefer 1 px borders, section rules, and spacing.
- Use shadows only for overlays, menus, dialogs, or real elevation.
- Do not add black drop shadows to every card.
- Do not use glowing red shadows.
- Keep shadow blur broad and opacity low.
- Separate dense information with one divider system, not boxes inside boxes.

---

## 7. Page structure

### 7.1 Navigation

Desktop navigation:

- One line
- 64 to 76 px tall
- Logo left or centered only when the layout explicitly requires it
- Primary navigation grouped clearly
- One primary action maximum
- Red may mark the active item or CTA, but not both if they compete
- Sticky only when it improves task continuity

Mobile navigation:

- Use a clear menu button with an accessible label
- Provide a full focus trap when the menu opens as a dialog
- Keep navigation targets at least 44 by 44 px
- Do not shrink the desktop navigation into an unreadable row

### 7.2 Hero

A strong Íntegro hero usually contains:

1. Logo or navigation
2. One concise headline
3. Optional supporting sentence
4. One primary CTA and at most one secondary CTA
5. One real visual asset or one strong typographic composition

Hero rules:

- Primary CTA visible in the first viewport
- Headline usually 2 lines or fewer on desktop
- Supporting copy usually 25 words or fewer
- Use `min-height: 100dvh` only when a full-viewport composition is justified
- Do not use `height: 100vh`
- Do not insert trust logos, feature bullets, pricing details, and metadata into the same hero
- No fake dashboard built from decorative rectangles
- No generic gradient blob as the only visual
- No scroll instruction

### 7.3 Informational sections

Each section should have one job:

- Explain
- Prove
- Compare
- Show
- Convert
- Reassure
- Navigate

A typical section should contain:

- One heading
- One short explanatory block
- One visual, metric group, or action

Do not repeat the same layout family in consecutive sections.

### 7.4 Statement sections

Use black statement sections for:

- Brand positioning
- Vision
- Project impact
- Key campaign message
- Closing conversion moment

Statement section rules:

- White heading and body text
- Red period or one red line
- Minimal secondary content
- No card grid inside the statement
- Maintain strong top and bottom space
- Limit to one or two per standard page

### 7.5 Footer

- Black background is preferred for corporate sites.
- Use white primary text and Brand Gray secondary text.
- Keep legal copy readable.
- Group links by real information architecture.
- Avoid decorative weather, clocks, build numbers, and fake status labels.
- Do not repeat the entire navigation structure without hierarchy.
- Use the red period only if the footer contains a true closing statement.

---

## 8. Core components

### 8.1 Buttons

Primary button:

```text
Background: Brand Red
Text: White
Font: Montserrat 600 or 700
Height: 48 to 52 px
Horizontal padding: 20 to 28 px
Radius: 0 to 4 px
```

Secondary button:

```text
Background: Black or transparent
Text: White on black, Black on light
Border: 1 px currentColor when transparent
```

Tertiary action:

```text
Text-only or icon-plus-text
Underline, arrow, or directional movement may indicate action
```

Interaction:

- Hover: small tonal shift or 1 to 2 px translation
- Active: subtle compression
- Focus: visible 2 px red outline with offset
- Disabled: preserve readable text and obvious non-interactive state
- Loading: maintain button width and show meaningful progress

Button rules:

- Labels should be 1 to 3 words when possible.
- Labels must stay on one line at desktop.
- Use concrete verbs.
- Do not place multiple red buttons in the same visual group.
- Do not use red text on a red outline button without sufficient contrast.

### 8.2 Links

- Body links must be visually distinguishable without relying only on color.
- Use underline, directional icon, or weight change.
- On black backgrounds, white links may receive a red underline on hover.
- External links should indicate external behavior when context requires it.
- Keep link behavior consistent across the page.

### 8.3 Forms

- Labels always appear above fields.
- Placeholder text is an example, never the only label.
- Input height is at least 44 px.
- Use black text on white or light-gray fields.
- Use a clear red focus ring.
- Error copy appears below the field and explains the fix.
- Required fields use text or accessible markup, not only a red asterisk.
- Group related controls with `fieldset` and `legend`.
- Preserve entered data after validation failure.
- Include loading, success, empty, and error states.

### 8.4 Cards

Use a card only when it represents:

- A selectable object
- A grouped project
- A distinct navigation destination
- An elevated overlay
- A repeatable entity with its own action

Do not use cards only to put text inside rectangles.

Preferred card behavior:

- Square or nearly square corners
- Thin border or strong surface contrast
- Large media crop
- Clear title and one supporting datum
- One action area
- No excessive badges
- No outer glow
- No nested cards

### 8.5 Modals and drawers

- Use dialogs for focused decisions.
- Use drawers for supplementary tasks that benefit from context.
- Trap focus.
- Restore focus on close.
- Close with Escape unless the action is destructive and requires confirmation.
- Do not use full-screen modal animation for simple confirmations.
- Use black overlays at controlled opacity.
- Keep red for the primary destructive action or key conversion, not both.

### 8.6 Icons

- Use one icon family per project.
- Prefer Phosphor, Tabler, Radix Icons, or the project's established library.
- Standardize stroke weight.
- Pair icon-only controls with accessible labels and tooltips.
- Do not use emoji as interface icons.
- Do not hand-draw SVG paths when a maintained icon exists.

---

## 9. Product UI, dashboards, and data visualization

### 9.1 Product-mode visual system

For authenticated applications:

- Use white or Brand Light Gray as the primary canvas.
- Use black for navigation, headings, and primary structure.
- Use Brand Gray for non-text surfaces and secondary diagrams.
- Use Brand Red sparingly for focus, critical status, or the most important KPI.
- Use smaller typography and tighter spacing than marketing pages.
- Keep the same Montserrat hierarchy and sharp geometry.

### 9.2 Dashboard layout

Preferred hierarchy:

1. Page title and date or filter context
2. Primary KPI group
3. One dominant visualization
4. Supporting breakdowns
5. Detailed table or drill-down

Avoid:

- Twelve equal cards before the user reaches the main insight
- A red accent on every KPI
- Large decorative hero sections in operational tools
- Excessive shadows
- Tiny gray text
- Multiple unrelated chart palettes

### 9.3 Tables

- Header text must remain readable.
- Row height should generally be 44 to 52 px.
- Use tabular numerals for numeric columns.
- Align text left, numbers right, and status centrally only when it improves scanning.
- Keep sticky headers for long tables.
- Provide sorting state visually and semantically.
- Use row hover only as assistance, not as the only selection cue.
- Avoid borders on every side of every cell.
- Use Brand Light Gray for separators or alternating bands.
- Use red only for a meaningful exception or critical value.
- Provide empty, loading, error, and no-results states.

### 9.4 Charts

Brand chart order:

1. Black
2. Brand Gray
3. Brand Light Gray
4. Brand Red as highlight

Rules:

- Red should normally identify the selected, target, exceptional, or critical series.
- Use direct labels or a clear legend.
- Do not encode meaning only by color.
- Add patterns, markers, labels, or line styles when series must be distinguished.
- Ensure chart text and gridlines remain legible.
- Avoid 3D charts, gradients, and decorative perspective.
- Prefer bars, lines, areas, scatter plots, and clear KPI summaries.
- Use donut charts only when the part-to-whole relationship is simple and limited.

### 9.5 Status colors

When a product requires success, warning, info, and danger:

- Reuse the product's established semantic system if it is accessible.
- Keep semantic colors within badges, icons, borders, and feedback messages.
- Do not allow semantic colors to become a second decorative palette.
- Add text labels and icons so color is not the only signal.

---

## 10. Imagery and media

### 10.1 Preferred subject matter

Use visuals that communicate:

- Architecture
- Place
- Human interaction
- Commercial activity
- Hospitality
- Community
- Construction and transformation
- Material detail
- Light, texture, and spatial experience
- Real projects and measurable outcomes

### 10.2 Image treatment

Preferred:

- Strong crops
- Full-bleed photography
- Black-and-white photography with limited red graphic accents
- Architectural geometry
- High contrast with preserved detail
- Clean documentary imagery
- Editorial image sequences
- Real screenshots for digital products

Avoid:

- Generic handshake stock photos
- People staring at laptops in anonymous offices
- Fake 3D glass objects
- AI-purple technology scenes
- Random abstract blobs
- Repeated images with different crops
- Text baked into images
- Decorative captions that invent provenance

### 10.3 Media requirements

- Use real provided brand assets first.
- Generate or source media only when permitted.
- Reserve aspect ratio to prevent layout shift.
- Provide meaningful alt text when the image communicates information.
- Use empty alt text for purely decorative images.
- Optimize responsive formats and sizes.
- Do not stretch images.
- Do not recreate the Íntegro logo from text or an approximation when an official asset exists.

---

## 11. Motion

### 11.1 Motion character

Íntegro motion should feel:

- Confident
- Smooth
- Directed
- Modern
- Precise
- Energetic without becoming playful or bouncy

Default:

```text
MOTION_INTENSITY: 4
```

### 11.2 Timing

Recommended ranges:

- Hover feedback: 120 to 180 ms
- Button and control transitions: 160 to 220 ms
- Section reveals: 300 to 600 ms
- Page transitions: 350 to 700 ms
- Stagger interval: 40 to 90 ms

Recommended easing:

```css
cubic-bezier(0.16, 1, 0.3, 1)
```

### 11.3 Approved motion

- Opacity plus 12 to 24 px vertical movement
- Subtle image scale from 1.03 to 1
- Directional underline movement
- Navigation reveal
- Controlled text line reveal
- One scroll-pinned narrative section when justified
- Shared-layout transitions in product UI
- Button compression on active state
- Chart transitions that clarify state changes

### 11.4 Motion restrictions

- Animate transform and opacity whenever possible.
- Do not animate width, height, top, or left continuously.
- No bouncing logos.
- No infinite floating cards.
- No cursor-following decoration by default.
- No multiple marquees.
- No autoplay motion that competes with reading.
- No animation merely because a library is installed.
- Do not store scroll or pointer position in component state on every frame.

### 11.5 Reduced motion

Every non-trivial animation must support `prefers-reduced-motion`.

Reduced-motion behavior:

- Remove parallax.
- Remove scroll hijacking.
- Replace stagger with immediate rendering.
- Keep state changes visible without animation.
- Do not hide content while waiting for an animation that will not run.

---

## 12. Content and voice

### 12.1 Voice

Write in a voice that is:

- Direct
- Confident
- Positive
- Human
- Specific
- Modern
- Professional without being distant

### 12.2 Content rules

- Use active voice.
- Use concrete verbs.
- Prefer short sentences.
- Lead with outcomes.
- Name real projects, places, services, or benefits.
- Keep one language per interface unless localization is intentional.
- Use accurate accents in Spanish.
- Re-read every visible string before delivery.
- Replace filler with factual or functional copy.
- Label mock data as mock data.

### 12.3 Avoid

- "Elevate your experience"
- "Seamless innovation"
- "Next-generation solutions"
- "Transforming the future" without a specific explanation
- Fake metrics
- Generic testimonials
- Fake partner logos
- Excessive exclamation marks
- Long corporate paragraphs
- Decorative jargon
- Repeated slogans in every section
- Em dashes as decorative separators

### 12.4 CTA language

Good:

- Conocer el proyecto
- Ver resultados
- Explorar espacios
- Solicitar información
- Iniciar sesión
- Crear reporte
- Guardar cambios
- Descargar informe

Weak:

- Descubre más
- Eleva tu experiencia
- Comienza tu viaje
- Hagamos magia
- Potencia tu futuro

Use the same label for the same intent throughout one page.

---

## 13. Responsive behavior

### 13.1 Mobile is a designed mode

Do not treat mobile as a stacked desktop screenshot.

For every multi-column section, define:

- Column collapse order
- Image order
- Heading size
- Horizontal padding
- Media aspect ratio
- CTA width
- Navigation behavior
- Table or chart fallback

### 13.2 Mobile rules

- Collapse asymmetry into a clear single column below 768 px.
- Preserve the strongest hierarchy, not the desktop whitespace.
- Use full-width CTAs only when it helps touch interaction.
- Keep body text at least 16 px.
- Keep touch targets at least 44 by 44 px.
- Avoid fixed-position elements that consume vertical space.
- Use `100dvh` instead of `100vh` for viewport-height compositions.
- Do not hide important content merely to make the layout fit.
- Avoid horizontal scrolling except for deliberate tables, carousels, or code.

### 13.3 Tablet rules

- Do not jump directly from a 12-column desktop grid to one column.
- Use intermediate 6-column or 8-column arrangements.
- Test navigation between 768 px and 1100 px.
- Ensure split headers do not create narrow unreadable copy columns.
- Move secondary actions before reducing control labels to icons.

### 13.4 Large-screen rules

- Cap line length and content width.
- Do not stretch forms across the full viewport.
- Allow media to grow more than body copy.
- Maintain intentional empty space.
- Keep the layout centered or compositionally anchored.

---

## 14. Accessibility

Accessibility is a non-negotiable brand quality because trust depends on usable interfaces.

### 14.1 Required

- Semantic HTML
- Logical heading order
- Keyboard access
- Visible focus
- Accessible labels
- Sufficient contrast
- Alt text
- Error association
- Reduced-motion support
- Correct landmark regions
- Dialog focus management
- Table headers and captions
- Screen-reader announcements for asynchronous updates
- Zoom compatibility up to at least 200%
- No information conveyed only by color

### 14.2 Focus style

Preferred:

```css
:focus-visible {
  outline: 2px solid var(--integro-red);
  outline-offset: 3px;
}
```

On a red surface, use a white or black focus ring with a second contrasting outline.

### 14.3 Contrast guardrails

- Normal body text: at least 4.5:1
- Large text: at least 3:1
- UI boundaries and focus indicators: at least 3:1 against adjacent colors
- Do not use Brand Gray as small text on white
- Do not use white small text on Brand Gray
- Do not rely on opacity to create muted text without checking contrast

### 14.4 Copy accessibility

- Use plain labels.
- Explain errors.
- Avoid ambiguous links such as "click here".
- Expand acronyms on first use when the audience may not know them.
- Use meaningful button names for screen readers.
- Do not hide critical instructions in placeholders.

---

## 15. Frontend engineering

### 15.1 Architecture

- Prefer semantic, composable components.
- Separate content, presentation, and data access.
- Preserve server rendering where available.
- Isolate client-only animation and browser APIs.
- Avoid global state for local visual interactions.
- Reuse tokens instead of repeating literal hex values.
- Keep interactive behavior testable.
- Do not add a dependency for a behavior that native CSS or existing utilities already solve well.

### 15.2 Dependency discipline

Before importing a library:

1. Inspect the existing dependency manifest.
2. Reuse an installed library when it fits.
3. If a new dependency is needed, state the install command.
4. Explain why native platform features or the existing stack are insufficient.
5. Do not mix multiple component systems.

### 15.3 Styling

Use semantic tokens:

- `surface`
- `surface-inverse`
- `surface-muted`
- `text`
- `text-muted`
- `border`
- `accent`
- `accent-hover`
- `focus`
- `danger`
- `success`
- `warning`

Avoid scattering:

```css
color: #c3302d;
```

through many files.

### 15.4 States

Every interactive or data-driven component must consider:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Empty
- Error
- Success
- Permission denied, when applicable
- Offline or stale data, when applicable

### 15.5 Performance

Targets:

- Optimize LCP media.
- Reserve image dimensions to prevent CLS.
- Keep input response fast.
- Lazy-load non-critical media and heavy components.
- Limit font weights and variants.
- Avoid large animation libraries for simple transitions.
- Clean up event listeners and animation instances.
- Do not apply expensive filters to scrolling containers.
- Use virtualization for genuinely large lists and tables.

### 15.6 SEO and metadata

For public pages:

- Preserve route slugs during redesign unless approved.
- Use one descriptive H1.
- Provide unique title and meta description.
- Preserve canonical URLs.
- Use structured data where relevant.
- Generate accurate social preview metadata.
- Keep meaningful content server-rendered when possible.
- Do not replace text with images of text.

---

## 16. Redesign protocol

### 16.1 Identify the mode

Choose one:

- Greenfield
- Preserve redesign
- Overhaul redesign

### 16.2 Audit before editing

Document:

- Current palette
- Current typography
- Logo usage
- Current spacing and radii
- Information architecture
- Route structure
- Navigation labels
- Conversion paths
- Analytics hooks
- Existing accessibility behavior
- Existing responsive problems
- Performance issues
- Reusable components
- Content that must remain
- Content that may be rewritten

### 16.3 Preserve redesign

Prioritize:

1. Token cleanup
2. Typography correction
3. Spacing and alignment
4. Contrast and accessibility
5. Component consistency
6. Responsive behavior
7. Media quality
8. Restrained motion

Do not silently change:

- URLs
- Form field names
- Analytics identifiers
- Legal copy
- Logo artwork
- Primary navigation terminology
- Business rules

### 16.4 Overhaul redesign

Preserve:

- Accurate content
- Required workflows
- URL structure when possible
- Analytics and conversion tracking
- Accessibility
- Search visibility
- Legal requirements

Rebuild:

- Visual hierarchy
- Layout families
- Component styling
- Responsive behavior
- Motion
- Media treatment
- Design tokens

---

## 17. Forbidden patterns

Do not ship these unless the user explicitly requires them:

### 17.1 Brand violations

- Any primary accent other than Brand Red
- A replacement font when Montserrat is available
- Montserrat and Helvetica used as a decorative pairing
- Rounded-card-heavy SaaS styling
- Red applied to every interactive element
- An approximated or redrawn Íntegro logo
- White small text on Brand Gray
- Brand Gray body copy on white
- Multiple decorative red dots

### 17.2 Generic AI interface patterns

- Purple or blue glow background
- Centered hero with a gradient orb
- Three equal feature cards
- Fake dashboard screenshots made from empty rectangles
- Fake partner logos
- Generic names and placeholder companies
- Excessive glassmorphism
- Infinite floating animation
- Decorative version numbers
- Weather, city, or time strips without a real use
- "Scroll to explore"
- Repeated section numbers
- Decorative progress bars
- Empty bento cells
- Every section beginning with a small uppercase eyebrow
- Multiple marquees
- Nested cards
- Button labels wrapping on desktop
- Unreviewed lorem ipsum

### 17.3 Engineering violations

- Switching frameworks without approval
- Installing a second design system
- Using component state for every scroll frame
- Animating layout properties continuously
- Missing focus states
- Missing loading and error states
- Placeholder-as-label forms
- Hard-coded color literals throughout the codebase
- Unbounded image dimensions
- `height: 100vh` for mobile full-screen sections
- Event listeners without cleanup
- Shipping code that does not compile
- Delivering partial files with "rest of code here" comments

---

## 18. Implementation workflow

### Step 1: Inspect

Review:

- Brief
- Brand assets
- Screenshots
- Existing code
- Routes
- Dependencies
- Current tokens
- Existing components
- Target devices
- Accessibility constraints

### Step 2: Declare the design read

State:

- Surface type
- Audience
- Dominant theme
- Layout direction
- Dial values
- Redesign mode

### Step 3: Establish tokens

Implement:

- Colors
- Typography
- Spacing
- Radius
- Border
- Shadow
- Z-index
- Motion timing

Do this before styling individual pages.

### Step 4: Plan the hierarchy

Identify:

- Primary message
- Primary action
- Supporting proof
- Main visual
- Secondary navigation
- Data priority
- Mobile order

### Step 5: Implement structure first

Build semantic layout and content order before decorative styling.

### Step 6: Apply brand expression

Add:

- Montserrat hierarchy
- Black and white contrast
- Red terminal period
- Controlled red CTA
- Asymmetric grid
- Real imagery
- Sharp geometry

### Step 7: Implement complete states

Add loading, empty, error, disabled, focus, hover, and active behavior.

### Step 8: Validate responsive behavior

Test at minimum:

- 360 px
- 390 px
- 768 px
- 1024 px
- 1280 px
- 1440 px

### Step 9: Validate accessibility and performance

Run:

- Keyboard test
- Screen-reader spot check
- Contrast check
- Reduced-motion check
- Lighthouse or equivalent
- Layout-shift check
- Production build

### Step 10: Run the final checklist

Do not declare completion while any required item fails.

---

## 19. Agent output contract

When generating code:

- Produce complete, runnable files.
- Preserve existing project conventions.
- Include required imports.
- Include installation commands for missing dependencies.
- Do not invent hidden APIs or unavailable assets.
- Use real content from the brief.
- Label sample data clearly.
- State unresolved assumptions.
- Do not claim tests passed unless they were run.
- Do not stop after a visual mock if implementation was requested.
- Do not provide a generic design explanation instead of code.
- Keep comments focused on non-obvious decisions.
- Avoid verbose comments that repeat the code.

When the user requests only design direction:

- Provide a concrete layout system.
- Specify color roles.
- Specify typography.
- Specify responsive behavior.
- Specify component states.
- Identify what not to do.
- Avoid vague phrases such as "make it modern".

---

## 20. Final pre-flight checklist

### Brand

- [ ] Montserrat is the active primary typeface.
- [ ] Helvetica appears only as fallback, not as a decorative pairing.
- [ ] Core colors match the official hex values.
- [ ] Red remains approximately 10% or less of the visual composition unless a campaign explicitly requires more.
- [ ] The red terminal period is used selectively.
- [ ] No unauthorized accent palette was introduced.
- [ ] The official logo asset is used without redrawing or distortion.
- [ ] Geometry remains sharp and editorial.

### Hierarchy and layout

- [ ] The page has one clear primary message.
- [ ] The page has one clear primary CTA.
- [ ] Desktop navigation fits on one line.
- [ ] Hero CTA is visible in the first viewport.
- [ ] Hero heading is not oversized into four or more lines.
- [ ] Section layouts vary intentionally.
- [ ] No three-equal-card default row appears.
- [ ] Split-header compositions are aligned and limited.
- [ ] Cards are used only for real entities or hierarchy.
- [ ] Mobile collapse order is explicit.
- [ ] No empty bento cells exist.
- [ ] No repeated decorative eyebrow labels appear over every section.

### Typography and copy

- [ ] Body text is at least 16 px on mobile.
- [ ] Body lines remain within approximately 60 to 70 characters.
- [ ] Brand Gray is not used as small body text on white.
- [ ] CTA labels do not wrap on desktop.
- [ ] Visible copy has been proofread.
- [ ] No lorem ipsum remains.
- [ ] No fake statistics appear as facts.
- [ ] One language is used consistently per interface.
- [ ] Spanish accents and punctuation are correct.

### Color and accessibility

- [ ] All normal text meets 4.5:1 contrast.
- [ ] Large text meets 3:1 contrast.
- [ ] Focus indicators are visible.
- [ ] Information is not encoded by color alone.
- [ ] Red does not represent both danger and neutral selection in the same view.
- [ ] White text is used on Brand Red buttons.
- [ ] White small text is not used on Brand Gray.
- [ ] Interactive targets meet minimum touch size.
- [ ] Keyboard navigation works.
- [ ] Dialog focus is managed.
- [ ] Form errors are associated with fields.
- [ ] Reduced-motion behavior exists.

### Components and states

- [ ] Buttons have hover, focus, active, disabled, and loading states.
- [ ] Forms have labels, helper text where needed, and inline errors.
- [ ] Data components have loading, empty, error, and no-results states.
- [ ] Tables have proper headers and sorting semantics.
- [ ] Icon-only controls have accessible names.
- [ ] Only one icon family is used.
- [ ] No nested-card clutter exists.
- [ ] No decorative red-dot pattern exists outside the approved terminal period.

### Media

- [ ] Real or approved imagery is used.
- [ ] No fake dashboard screenshot is assembled from decorative boxes.
- [ ] Images have reserved dimensions.
- [ ] Responsive image sizes are configured.
- [ ] Informative images have meaningful alt text.
- [ ] Decorative images have empty alt text.
- [ ] Images are not stretched or distorted.

### Motion and performance

- [ ] Motion communicates hierarchy, feedback, state, or narrative.
- [ ] Motion uses transform and opacity where possible.
- [ ] Scroll listeners and animations have cleanup.
- [ ] No scroll position is stored in state every frame.
- [ ] No infinite decorative movement competes with reading.
- [ ] LCP media is optimized.
- [ ] Layout shift is controlled.
- [ ] Font weights are limited.
- [ ] Heavy components are lazy-loaded where appropriate.
- [ ] The production build completes.

### Redesign safety

- [ ] Route slugs remain intact unless approved.
- [ ] Analytics hooks remain intact unless approved.
- [ ] Form field names remain intact unless approved.
- [ ] Legal copy remains intact unless approved.
- [ ] Existing accessibility behavior has not regressed.
- [ ] Content and information architecture changes are documented.

If any required checkbox fails, continue refining before delivery.

---

# Appendix A. Portable CSS tokens

```css
:root {
  /* Official brand colors */
  --integro-black: #000000;
  --integro-gray: #89888a;
  --integro-light-gray: #e1e2e4;
  --integro-red: #c3302d;
  --integro-white: #ffffff;

  /* Accessible derived neutral */
  --integro-gray-text: #747376;

  /* Semantic surfaces */
  --surface: var(--integro-white);
  --surface-inverse: var(--integro-black);
  --surface-muted: var(--integro-light-gray);
  --surface-secondary: var(--integro-gray);

  /* Semantic text */
  --text-primary: var(--integro-black);
  --text-inverse: var(--integro-white);
  --text-muted: var(--integro-gray-text);

  /* Interaction */
  --accent: var(--integro-red);
  --accent-hover: #ad2a28;
  --accent-active: #982523;
  --focus: var(--integro-red);

  /* Borders */
  --border-strong: var(--integro-black);
  --border-default: #b8b8ba;
  --border-soft: var(--integro-light-gray);

  /* Typography */
  --font-brand:
    "Montserrat",
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;

  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --type-display-xl: clamp(3.5rem, 7.5vw, 7rem);
  --type-display: clamp(2.75rem, 5.5vw, 5.5rem);
  --type-h1: clamp(2.5rem, 4.5vw, 4.75rem);
  --type-h2: clamp(2rem, 3.5vw, 3.75rem);
  --type-h3: clamp(1.25rem, 2vw, 1.75rem);
  --type-body-lg: clamp(1.05rem, 1.2vw, 1.25rem);
  --type-body: 1rem;
  --type-small: 0.875rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;
  --space-10: 8rem;

  /* Shape */
  --radius-control: 0.25rem;
  --radius-surface: 0.25rem;
  --radius-pill: 999px;

  /* Motion */
  --duration-fast: 160ms;
  --duration-base: 220ms;
  --duration-slow: 480ms;
  --ease-brand: cubic-bezier(0.16, 1, 0.3, 1);

  /* Layering */
  --z-base: 0;
  --z-sticky: 20;
  --z-dropdown: 40;
  --z-overlay: 60;
  --z-modal: 80;
  --z-toast: 100;
}

html {
  font-family: var(--font-brand);
  color: var(--text-primary);
  background: var(--surface);
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  font-size: var(--type-body);
  line-height: 1.6;
}

::selection {
  color: var(--integro-white);
  background: var(--integro-red);
}

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}

.integro-container {
  width: min(calc(100% - 2rem), 90rem);
  margin-inline: auto;
}

.integro-display {
  max-width: 14ch;
  margin: 0;
  font-size: var(--type-display);
  font-weight: var(--font-weight-bold);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.integro-body {
  max-width: 65ch;
  color: var(--text-muted);
}

.integro-period {
  color: var(--integro-red);
}

.integro-section-dark {
  color: var(--text-inverse);
  background: var(--surface-inverse);
}

.integro-section-light {
  color: var(--text-primary);
  background: var(--surface);
}

.integro-section-muted {
  color: var(--text-primary);
  background: var(--surface-muted);
}

.integro-button {
  min-height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding-inline: 1.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-brand),
    background-color var(--duration-base) var(--ease-brand),
    border-color var(--duration-base) var(--ease-brand),
    color var(--duration-base) var(--ease-brand);
}

.integro-button-primary {
  color: var(--integro-white);
  background: var(--accent);
}

.integro-button-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.integro-button-primary:active {
  background: var(--accent-active);
  transform: translateY(0) scale(0.99);
}

.integro-button-secondary {
  color: var(--integro-white);
  background: var(--integro-black);
}

.integro-button-outline {
  color: var(--integro-black);
  border-color: var(--integro-black);
  background: transparent;
}

@media (max-width: 47.999rem) {
  .integro-container {
    width: min(calc(100% - 2rem), 90rem);
  }

  .integro-display {
    max-width: 16ch;
    line-height: 1.02;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# Appendix B. Tailwind v4 token mapping

Use only when the project already uses Tailwind or the user requests it.

```css
@import "tailwindcss";

@theme {
  --color-integro-black: #000000;
  --color-integro-gray: #89888a;
  --color-integro-light-gray: #e1e2e4;
  --color-integro-red: #c3302d;
  --color-integro-red-hover: #ad2a28;
  --color-integro-red-active: #982523;
  --color-integro-gray-text: #747376;
  --color-integro-white: #ffffff;

  --font-brand:
    "Montserrat",
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;

  --ease-brand: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Example heading:

```html
<h1
  class="max-w-[14ch] font-brand text-[clamp(2.75rem,5.5vw,5.5rem)]
         font-bold leading-[0.98] tracking-[-0.045em]"
>
  Creamos lugares que dejan huella<span
    aria-hidden="true"
    class="text-integro-red"
  >.</span>
</h1>
```

Example primary action:

```html
<a
  href="/proyectos"
  class="inline-flex min-h-12 items-center justify-center whitespace-nowrap
         rounded-[4px] bg-integro-red px-6 font-brand font-semibold text-white
         transition duration-200 ease-brand
         hover:-translate-y-px hover:bg-integro-red-hover
         active:translate-y-0 active:scale-[0.99]
         focus-visible:outline-2 focus-visible:outline-offset-4
         focus-visible:outline-integro-red"
>
  Ver proyectos
</a>
```

---

# Appendix C. Recommended component inventory

Create or map these components in the project's existing system:

```text
BrandLogo
BrandHeading
BrandPeriod
PageContainer
Section
SplitIntro
StatementSection
MediaSection
ProjectCard
Metric
MetricGroup
PrimaryButton
SecondaryButton
TextLink
Navigation
MobileNavigation
Breadcrumbs
Field
SelectField
CheckboxField
RadioGroup
FormError
Alert
Dialog
Drawer
Tabs
Accordion
DataTable
ChartFrame
EmptyState
LoadingState
ErrorState
Footer
```

Each component must:

- Use semantic tokens
- Include keyboard behavior
- Include visible focus
- Define mobile behavior
- Expose complete states
- Avoid hard-coded page-specific colors
- Preserve the brand shape and type system
- Work without animation under reduced-motion settings

---

# Appendix D. Quick design recipes

## D.1 Corporate landing page

```text
Theme: Black-dominant
Dials: 7 / 4 / 3
Hero: Asymmetric split with architectural image
Heading: Montserrat Bold, red period
CTA: One red primary, one white text link
Sections: White project proof, black manifesto, light-gray metrics
Cards: Project cards only
Motion: Hero reveal, project image hover, one section stagger
```

## D.2 Internal dashboard

```text
Theme: Light functional
Dials: 4 / 2 / 8
Header: Compact, black title, restrained filter row
KPI: Plain layout with one red highlighted KPI
Chart: Black, gray, light gray, red selected series
Table: Light-gray separators, sticky header
Cards: Only for grouped entities
Motion: State transitions only
```

## D.3 Property or development showcase

```text
Theme: White and black editorial
Dials: 7 / 5 / 4
Hero: Full-bleed property image with aligned copy block
Typography: Large Montserrat, red period
Sections: Project facts, place story, gallery, impact metrics
Accent: Red rule, map marker, CTA
Motion: Image reveal and one scroll-linked sequence
```

## D.4 Form-heavy portal

```text
Theme: Light
Dials: 4 / 2 / 6
Layout: Narrow form column with contextual side panel
Fields: Labels above, 48 px controls
Primary action: Red
Secondary action: Black outline
States: Inline validation, save progress, permission feedback
Motion: Minimal
```

---

End of skill.
