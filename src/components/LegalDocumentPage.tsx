import type { LegalDocument } from "@/content/legal";

export function LegalDocumentPage({ doc }: { doc: LegalDocument }) {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 sm:py-12" dir="rtl">
      <article className="rounded-3xl border bg-card shadow-card p-6 sm:p-10">
        <header className="border-b pb-6 mb-7">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-gradient-sunset">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">עודכן לאחרונה: {doc.updated}</p>
        </header>

        <div className="space-y-7 text-right leading-relaxed">
          {doc.sections.map((section, index) => (
            <section key={index} className="space-y-3">
              {section.heading && <h2 className="font-display text-xl font-bold">{section.heading}</h2>}

              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="text-muted-foreground whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="list-disc pe-6 space-y-2 text-muted-foreground marker:text-primary">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              )}

              {section.links && section.links.length > 0 && <LegalLinks links={section.links} />}

              {section.subsections?.map((subsection, subsectionIndex) => (
                <div key={subsectionIndex} className="mt-4 space-y-2 rounded-2xl bg-muted/25 p-4 sm:p-5">
                  <h3 className="font-display font-bold">{subsection.heading}</h3>
                  {subsection.paragraphs?.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="text-muted-foreground whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))}
                  {subsection.bullets && (
                    <ul className="list-disc pe-6 space-y-2 text-muted-foreground marker:text-primary">
                      {subsection.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {subsection.links && subsection.links.length > 0 && <LegalLinks links={subsection.links} />}
                </div>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

function LegalLinks({ links }: { links: { label: string; url: string }[] }) {
  return (
    <ul className="space-y-2">
      {links.map((link, index) => (
        <li key={index}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:opacity-80"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
