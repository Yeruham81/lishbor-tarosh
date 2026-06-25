import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LegalDocument } from "@/content/legal";

export function LegalModal({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: LegalDocument;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gradient-sunset text-right">
            {doc.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-right">עודכן לאחרונה: {doc.updated}</p>
        </DialogHeader>
        <div className="overflow-y-auto pe-2 -me-2 space-y-5 text-right text-sm leading-relaxed">
          {doc.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              {s.heading && (
                <h3 className="font-display font-bold text-base text-foreground">{s.heading}</h3>
              )}
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="text-muted-foreground whitespace-pre-wrap">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="list-disc pe-5 space-y-1 text-muted-foreground marker:text-primary">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
              {s.subsections?.map((sub, j) => (
                <div key={j} className="space-y-1 mt-2">
                  <h4 className="font-semibold text-foreground">{sub.heading}</h4>
                  {sub.paragraphs?.map((p, k) => (
                    <p key={k} className="text-muted-foreground whitespace-pre-wrap">
                      {p}
                    </p>
                  ))}
                  {sub.bullets && (
                    <ul className="list-disc pe-5 space-y-1 text-muted-foreground marker:text-primary">
                      {sub.bullets.map((b, k) => (
                        <li key={k}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
