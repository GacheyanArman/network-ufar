import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { PageShell } from "@/shared/ui/Layout";
import { cookies } from "next/headers";
import UiIcon from "@/shared/ui/UiIcon";

export const metadata = {
  title: "Help & Support | UFAR Network",
  description: "Get help, contact support, and find answers to frequently asked questions about UFARnet.",
};

const HELP_CONTENT = {
  en: {
    title: "Help & Support",
    subtitle: "Find answers and get assistance with UFAR Network",
    searchPlaceholder: "Search help center...",
    faqTitle: "Frequently Asked Questions",
    contactTitle: "Contact Support",
    contactDesc: "If you have issues with registration, academic details, or bugs, reach out to the UFAR IT Helpdesk.",
    emailLabel: "Email Support",
    locationLabel: "Office",
    hoursLabel: "Working Hours",
    phoneLabel: "Phone",
    faqs: [
      {
        q: "How do I enroll in Courses?",
        a: "Your courses are automatically synchronized based on your faculty and study year. If you don't see your courses, please check your Profile details or contact your department secretary."
      },
      {
        q: "Where can I find study materials?",
        a: "Navigate to 'Materials' in the main menu to browse notes, summaries, and exam guides shared by other students. You can also upload your own resources to help your peers."
      },
      {
        q: "How do I message classmates?",
        a: "Go to the 'Messages' tab, click on 'New Message' and search for your classmate by name or username to start chatting."
      },
      {
        q: "How do I change my interface language?",
        a: "You can change the language (English, French, or Armenian) at any time using the language switcher dropdown in the top-right corner of the screen."
      },
      {
        q: "Can I manage my notifications?",
        a: "Yes, go to My Profile, click on 'Settings', and you will be able to customize your notification preferences for social, messages, and academic events."
      }
    ]
  },
  fr: {
    title: "Aide & Support",
    subtitle: "Trouvez des réponses et obtenez de l'aide avec UFAR Network",
    searchPlaceholder: "Rechercher dans le centre d'aide...",
    faqTitle: "Questions Fréquentes",
    contactTitle: "Contacter le Support",
    contactDesc: "Si vous rencontrez des problèmes d'inscription, des détails académiques ou des bugs, contactez le bureau d'aide informatique de l'UFAR.",
    emailLabel: "Support par Email",
    locationLabel: "Bureau",
    hoursLabel: "Heures de travail",
    phoneLabel: "Téléphone",
    faqs: [
      {
        q: "Comment m'inscrire aux cours?",
        a: "Vos cours sont automatiquement synchronisés en fonction de votre faculté et de votre année d'études. Si vous ne voyez pas vos cours, veuillez vérifier les détails de votre profil ou contacter le secrétariat de votre département."
      },
      {
        q: "Où puis-je trouver des matériaux d'étude?",
        a: "Accédez à la section 'Matériaux' dans le menu principal pour parcourir les notes, résumés et guides d'examen partagés par d'autres étudiants. Vous pouvez également télécharger vos propres ressources."
      },
      {
        q: "Comment envoyer un message à un camarade?",
        a: "Allez dans l'onglet 'Messages', cliquez sur 'Nouveau message' et recherchez votre camarade par son nom ou son nom d'utilisateur pour commencer à discuter."
      },
      {
        q: "Comment changer la langue de l'interface?",
        a: "Vous pouvez changer la langue (anglais, français ou arménien) à tout moment en utilisant le menu déroulant de sélection de langue situé dans le coin supérieur droit."
      },
      {
        q: "Puis-je gérer mes notifications?",
        a: "Oui, allez sur votre profil, cliquez sur 'Paramètres' et vous pourrez personnaliser vos préférences de notification pour l'activité sociale, les messages et les événements académiques."
      }
    ]
  },
  hy: {
    title: "Օգնություն և Աջակցություն",
    subtitle: "Գտեք հարցերի պատասխանները և ստացեք աջակցություն UFAR Network-ում",
    searchPlaceholder: "Որոնել օգնության կենտրոնում...",
    faqTitle: "Հաճախակի Տրվող Հարցեր",
    contactTitle: "Կապ Աջակցության Հետ",
    contactDesc: "Գրանցման, ակադեմիական տվյալների կամ տեխնիկական խնդիրների դեպքում կարող եք դիմել UFAR ՏՏ աջակցության բաժին:",
    emailLabel: "Էլ. Փոստ",
    locationLabel: "Գրասենյակ",
    hoursLabel: "Աշխատանքային Ժամեր",
    phoneLabel: "Հեռախոս",
    faqs: [
      {
        q: "Ինչպե՞ս գրանցվել դասընթացներում:",
        a: "Ձեր դասընթացները ավտոմատ կերպով համաժամեցվում են ըստ Ձեր ֆակուլտետի և ուսումնական տարվա: Եթե չեք տեսնում Ձեր դասընթացները, ստուգեք Ձեր պրոֆիլի տվյալները կամ դիմեք դեկանատ:"
      },
      {
        q: "Որտե՞ղ կարող եմ գտնել ուսումնական նյութեր:",
        a: "Գլխավոր մենյուից անցեք «Նյութեր» բաժին՝ այլ ուսանողների կողմից տարածված դասախոսությունները, ամփոփումները և քննական նյութերը տեսնելու համար: Կարող եք նաև ներբեռնել Ձեր սեփական նյութերը:"
      },
      {
        q: "Ինչպե՞ս նամակ գրել համակուրսեցուն:",
        a: "Անցեք «Հաղորդագրություններ» բաժին, սեղմեք «Նոր նամակ» և փնտրեք Ձեր համակուրսեցուն ըստ անվան կամ օգտանվան՝ զրույցը սկսելու համար:"
      },
      {
        q: "Ինչպե՞ս փոխել համակարգի լեզուն:",
        a: "Դուք կարող եք ցանկացած պահի փոխել լեզուն (անգլերեն, ֆրանսերեն կամ հայերեն)՝ օգտագործելով էկրանի վերևի աջ անկյունում գտնվող լեզվի ընտրիչը:"
      },
      {
        q: "Կարո՞ղ եմ կառավարել ծանուցումները:",
        a: "Այո, անցեք Ձեր պրոֆիլի «Կարգավորումներ» բաժին, որտեղ կարող եք հարմարեցնել ծանուցումների նախընտրությունները տարբեր տեսակի ակտիվությունների համար:"
      }
    ]
  }
};

export default async function HelpPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "en") as "en" | "fr" | "hy";
  const content = HELP_CONTENT[lang] || HELP_CONTENT.en;

  return (
    <PageShell>
      <div className="uf-help-page" style={{ maxWidth: 960, margin: "0 auto", padding: "16px 8px" }}>
        {/* Header styling mimics other pages for perfect consistency */}
        <header className="page-header" style={{ marginBottom: "24px" }}>
          <div className="page-header-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 className="page-header-title" style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
                {content.title}
              </h1>
              <p className="page-header-desc" style={{ color: "#64748b", marginTop: "4px", fontSize: "0.95rem" }}>
                {content.subtitle}
              </p>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "var(--french-blue-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--french-blue)" }}>
              <UiIcon name="help" size={24} />
            </div>
          </div>
        </header>

        <div className="help-grid" style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px" }}>
          {/* FAQ Column */}
          <section className="help-card-container">
            <div className="card" style={{ padding: "24px", borderRadius: "16px", background: "#ffffff", border: "1px solid #d9e2ef", boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "20px", marginTop: 0 }}>
                {content.faqTitle}
              </h2>
              
              <div className="faq-list" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {content.faqs.map((faq, i) => (
                  <div key={i} className="faq-item" style={{ borderBottom: i < content.faqs.length - 1 ? "1px solid #e2e8f0" : "none", paddingBottom: i < content.faqs.length - 1 ? "16px" : "0" }}>
                    <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--french-gold)" }}></span>
                      {faq.q}
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.55, margin: 0, paddingLeft: "14px" }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Column */}
          <section className="contact-card-container">
            <div className="card" style={{ padding: "24px", borderRadius: "16px", background: "#ffffff", border: "1px solid #d9e2ef", boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px", marginTop: 0 }}>
                  {content.contactTitle}
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                  {content.contactDesc}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Email Support */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0f4f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                    <UiIcon name="mail" size={16} />
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{content.emailLabel}</span>
                    <a href="mailto:armangacheyan23@gmail.com" style={{ fontSize: "0.9rem", color: "var(--french-blue)", fontWeight: "bold", textDecoration: "none" }}>armangacheyan23@gmail.com</a>
                  </div>
                </div>

                {/* Phone */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0f4f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                    <UiIcon name="message" size={16} />
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{content.phoneLabel}</span>
                    <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>+37491082813</span>
                  </div>
                </div>

                {/* Office */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0f4f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                    <UiIcon name="building" size={16} />
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{content.locationLabel}</span>
                    <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>None</span>
                  </div>
                </div>

                {/* Hours */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0f4f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                    <UiIcon name="clock" size={16} />
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{content.hoursLabel}</span>
                    <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>Mon - Fri, 9:00 - 18:00</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Responsive inline CSS styling adjustments */}
        <style>{`
          @media (max-width: 768px) {
            .help-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </PageShell>
  );
}
