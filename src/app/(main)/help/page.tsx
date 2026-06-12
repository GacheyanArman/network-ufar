import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { PageShell } from "@/shared/ui/Layout";
import { cookies } from "next/headers";
import UiIcon from "@/shared/ui/UiIcon";

export const metadata = {
  title: "Student Help Center | UFAR Network",
  description: "Get academic, campus and technical help, read the rules, or contact moderators on UFARnet.",
};

type HelpLink = { label: string; href: string; external?: boolean };
type HelpFaq = { q: string; a: string };
type HelpSection = {
  icon: string;
  title: string;
  desc: string;
  links?: HelpLink[];
  faqs?: HelpFaq[];
  rules?: string[];
};
type HelpContent = {
  title: string;
  subtitle: string;
  askClassmates: string;
  sections: HelpSection[];
};

const SUPPORT_EMAIL = "armangacheyan23@gmail.com";

const HELP_CONTENT: Record<"en" | "fr" | "hy", HelpContent> = {
  en: {
    title: "Student Help Center",
    subtitle: "Academic, campus and technical help — all in one place",
    askClassmates: "Ask classmates",
    sections: [
      {
        icon: "message-circle",
        title: "Ask for help",
        desc: "The fastest answers come from other students. Post a question on the campus wall or message a classmate directly.",
        links: [
          { label: "Ask classmates", href: "/feed?filter=questions" },
          { label: "Messages", href: "/messages" },
        ],
        faqs: [
          {
            q: "How do I message classmates?",
            a: "Go to Messages, click 'New Message' and search for your classmate by name or username to start chatting.",
          },
        ],
      },
      {
        icon: "graduation",
        title: "Academic help",
        desc: "Courses, schedule, study materials and study groups.",
        links: [
          { label: "Courses", href: "/courses" },
          { label: "Materials", href: "/study-materials" },
          { label: "Study groups", href: "/study-groups" },
        ],
        faqs: [
          {
            q: "How do I enroll in Courses?",
            a: "Your courses are automatically synchronized based on your faculty and study year. If you don't see your courses, check your Profile details or contact your department secretary.",
          },
          {
            q: "Where can I find study materials?",
            a: "Open 'Materials' in the main menu to browse notes, summaries and exam guides shared by other students. You can also upload your own resources.",
          },
        ],
      },
      {
        icon: "building",
        title: "Campus help",
        desc: "Campus life tools: lost something, looking for an event or a group to join.",
        links: [
          { label: "Lost & Found", href: "/lost-found" },
          { label: "Groups", href: "/communities" },
          { label: "Events", href: "/feed?filter=events" },
        ],
      },
      {
        icon: "settings",
        title: "Technical support",
        desc: "Problems with registration, academic details or bugs? Reach out to the UFAR IT Helpdesk.",
        links: [{ label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, external: true }],
        faqs: [
          {
            q: "How do I change my interface language?",
            a: "Use the language switcher (English, French or Armenian) in the top-right corner of the screen.",
          },
          {
            q: "Can I manage my notifications?",
            a: "Yes — go to Settings to customize your notification preferences for social, messages and academic events.",
          },
        ],
      },
      {
        icon: "book",
        title: "Rules",
        desc: "Keep UFARnet a safe and useful space for every student.",
        rules: [
          "Be respectful — no harassment, hate speech or personal attacks.",
          "Academic honesty: share materials to help, not to cheat on exams.",
          "No spam, ads or irrelevant self-promotion.",
          "Post in the right section and keep content campus-related.",
          "Report problems instead of escalating conflicts.",
        ],
      },
      {
        icon: "shield-check",
        title: "Contact moderators",
        desc: "Report inappropriate content, a conflict or a problem with another user. Moderators reply as fast as they can.",
        links: [
          { label: "Write to moderators", href: `mailto:${SUPPORT_EMAIL}?subject=Moderation%20request`, external: true },
        ],
      },
    ],
  },
  fr: {
    title: "Centre d'aide étudiant",
    subtitle: "Aide académique, campus et technique — tout au même endroit",
    askClassmates: "Demander aux camarades",
    sections: [
      {
        icon: "message-circle",
        title: "Demander de l'aide",
        desc: "Les réponses les plus rapides viennent des autres étudiants. Posez une question sur le mur du campus ou écrivez directement à un camarade.",
        links: [
          { label: "Demander aux camarades", href: "/feed?filter=questions" },
          { label: "Messages", href: "/messages" },
        ],
        faqs: [
          {
            q: "Comment envoyer un message à un camarade?",
            a: "Allez dans Messages, cliquez sur 'Nouveau message' et recherchez votre camarade par son nom ou son nom d'utilisateur.",
          },
        ],
      },
      {
        icon: "graduation",
        title: "Aide académique",
        desc: "Cours, emploi du temps, matériaux d'étude et groupes d'étude.",
        links: [
          { label: "Cours", href: "/courses" },
          { label: "Matériaux", href: "/study-materials" },
          { label: "Groupes d'étude", href: "/study-groups" },
        ],
        faqs: [
          {
            q: "Comment m'inscrire aux cours?",
            a: "Vos cours sont synchronisés automatiquement selon votre faculté et votre année d'études. Si vous ne les voyez pas, vérifiez votre profil ou contactez le secrétariat de votre département.",
          },
          {
            q: "Où puis-je trouver des matériaux d'étude?",
            a: "Ouvrez 'Matériaux' dans le menu principal pour parcourir les notes, résumés et guides d'examen partagés par d'autres étudiants. Vous pouvez aussi ajouter vos propres ressources.",
          },
        ],
      },
      {
        icon: "building",
        title: "Aide campus",
        desc: "Outils de la vie du campus : objet perdu, événement ou groupe à rejoindre.",
        links: [
          { label: "Objets trouvés", href: "/lost-found" },
          { label: "Groupes", href: "/communities" },
          { label: "Événements", href: "/feed?filter=events" },
        ],
      },
      {
        icon: "settings",
        title: "Support technique",
        desc: "Problèmes d'inscription, de détails académiques ou bugs ? Contactez le Helpdesk informatique de l'UFAR.",
        links: [{ label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, external: true }],
        faqs: [
          {
            q: "Comment changer la langue de l'interface?",
            a: "Utilisez le sélecteur de langue (anglais, français ou arménien) dans le coin supérieur droit de l'écran.",
          },
          {
            q: "Puis-je gérer mes notifications?",
            a: "Oui — allez dans Paramètres pour personnaliser vos préférences de notification (social, messages, événements académiques).",
          },
        ],
      },
      {
        icon: "book",
        title: "Règles",
        desc: "Gardons UFARnet sûr et utile pour chaque étudiant.",
        rules: [
          "Soyez respectueux — pas de harcèlement, de discours haineux ni d'attaques personnelles.",
          "Honnêteté académique : partagez pour aider, pas pour tricher aux examens.",
          "Pas de spam, de publicité ni d'autopromotion hors sujet.",
          "Publiez dans la bonne section et restez sur des sujets liés au campus.",
          "Signalez les problèmes au lieu d'envenimer les conflits.",
        ],
      },
      {
        icon: "shield-check",
        title: "Contacter les modérateurs",
        desc: "Signalez un contenu inapproprié, un conflit ou un problème avec un autre utilisateur. Les modérateurs répondent dès que possible.",
        links: [
          { label: "Écrire aux modérateurs", href: `mailto:${SUPPORT_EMAIL}?subject=Moderation%20request`, external: true },
        ],
      },
    ],
  },
  hy: {
    title: "Ուսանողական օգնության կենտրոն",
    subtitle: "Ակադեմիական, համալսարանական և տեխնիկական օգնություն՝ մեկ վայրում",
    askClassmates: "Հարցրու համակուրսեցիներին",
    sections: [
      {
        icon: "message-circle",
        title: "Խնդրել օգնություն",
        desc: "Ամենաարագ պատասխանները ստանում ես այլ ուսանողներից։ Հարց տուր համալսարանի պատին կամ գրիր համակուրսեցուն։",
        links: [
          { label: "Հարցրու համակուրսեցիներին", href: "/feed?filter=questions" },
          { label: "Հաղորդագրություններ", href: "/messages" },
        ],
        faqs: [
          {
            q: "Ինչպե՞ս նամակ գրել համակուրսեցուն:",
            a: "Անցիր «Հաղորդագրություններ», սեղմիր «Նոր նամակ» և փնտրիր համակուրսեցուն ըստ անվան կամ օգտանվան։",
          },
        ],
      },
      {
        icon: "graduation",
        title: "Ակադեմիական օգնություն",
        desc: "Դասընթացներ, դասացուցակ, ուսումնական նյութեր և ուսումնական խմբեր։",
        links: [
          { label: "Դասընթացներ", href: "/courses" },
          { label: "Նյութեր", href: "/study-materials" },
          { label: "Ուսումնական խմբեր", href: "/study-groups" },
        ],
        faqs: [
          {
            q: "Ինչպե՞ս գրանցվել դասընթացներում:",
            a: "Դասընթացները ավտոմատ համաժամեցվում են ըստ ֆակուլտետի և ուսումնական տարվա։ Եթե չես տեսնում քո դասընթացները, ստուգիր պրոֆիլի տվյալները կամ դիմիր դեկանատ։",
          },
          {
            q: "Որտե՞ղ կարող եմ գտնել ուսումնական նյութեր:",
            a: "Բացիր «Նյութեր» բաժինը՝ այլ ուսանողների տարածած դասախոսությունները, ամփոփումները և քննական նյութերը տեսնելու համար։ Կարող ես նաև ավելացնել քո նյութերը։",
          },
        ],
      },
      {
        icon: "building",
        title: "Համալսարանական օգնություն",
        desc: "Համալսարանական կյանքի գործիքներ՝ կորցրած իրեր, միջոցառումներ, խմբեր։",
        links: [
          { label: "Կորած և գտնված", href: "/lost-found" },
          { label: "Խմբեր", href: "/communities" },
          { label: "Միջոցառումներ", href: "/feed?filter=events" },
        ],
      },
      {
        icon: "settings",
        title: "Տեխնիկական աջակցություն",
        desc: "Գրանցման, ակադեմիական տվյալների կամ տեխնիկական խնդիրների դեպքում դիմիր UFAR ՏՏ աջակցության բաժին։",
        links: [{ label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, external: true }],
        faqs: [
          {
            q: "Ինչպե՞ս փոխել համակարգի լեզուն:",
            a: "Օգտագործիր լեզվի ընտրիչը (անգլերեն, ֆրանսերեն կամ հայերեն) էկրանի վերևի աջ անկյունում։",
          },
          {
            q: "Կարո՞ղ եմ կառավարել ծանուցումները:",
            a: "Այո — անցիր «Կարգավորումներ» բաժին՝ ծանուցումների նախընտրությունները հարմարեցնելու համար։",
          },
        ],
      },
      {
        icon: "book",
        title: "Կանոններ",
        desc: "Պահպանենք UFARnet-ը անվտանգ և օգտակար բոլոր ուսանողների համար։",
        rules: [
          "Եղիր հարգալից — ոչ մի ոտնձգություն, ատելության խոսք կամ անձնական հարձակում։",
          "Ակադեմիական ազնվություն. կիսվիր նյութերով՝ օգնելու, ոչ թե քննություններին խաբելու համար։",
          "Ոչ մի սպամ, գովազդ կամ անտեղի ինքնագովազդ։",
          "Հրապարակիր ճիշտ բաժնում և մնա համալսարանական թեմաների շրջանակում։",
          "Խնդիրների դեպքում զեկուցիր՝ կոնֆլիկտը սրելու փոխարեն։",
        ],
      },
      {
        icon: "shield-check",
        title: "Կապ մոդերատորների հետ",
        desc: "Զեկուցիր անպատշաճ բովանդակության, կոնֆլիկտի կամ այլ օգտատիրոջ հետ խնդրի մասին։ Մոդերատորները կպատասխանեն հնարավորինս արագ։",
        links: [
          { label: "Գրել մոդերատորներին", href: `mailto:${SUPPORT_EMAIL}?subject=Moderation%20request`, external: true },
        ],
      },
    ],
  },
};

function SectionLink({ link }: { link: HelpLink }) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "8px",
    background: "#f0f4f9",
    color: "var(--french-blue)",
    fontSize: "0.85rem",
    fontWeight: 700,
    textDecoration: "none",
  };
  if (link.external) {
    return (
      <a href={link.href} style={style}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} style={style}>
      {link.label}
    </Link>
  );
}

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
        <header className="page-header" style={{ marginBottom: "24px" }}>
          <div className="page-header-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h1 className="page-header-title" style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
                {content.title}
              </h1>
              <p className="page-header-desc" style={{ color: "#64748b", marginTop: "4px", fontSize: "0.95rem" }}>
                {content.subtitle}
              </p>
            </div>
            <Link
              href="/feed?filter=questions"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                background: "var(--french-blue)",
                color: "#ffffff",
                fontSize: "0.9rem",
                fontWeight: 800,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <UiIcon name="message-circle" size={16} />
              {content.askClassmates}
            </Link>
          </div>
        </header>

        <div className="help-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
          {content.sections.map((section) => (
            <section
              key={section.title}
              className="card"
              style={{
                padding: "20px",
                borderRadius: "16px",
                background: "#ffffff",
                border: "1px solid #d9e2ef",
                boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "var(--french-blue-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--french-blue)",
                    flexShrink: 0,
                  }}
                >
                  <UiIcon name={section.icon} size={18} />
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {section.title}
                </h2>
              </div>

              <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.55, margin: 0 }}>
                {section.desc}
              </p>

              {section.links && section.links.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {section.links.map((link) => (
                    <SectionLink key={link.href + link.label} link={link} />
                  ))}
                </div>
              ) : null}

              {section.rules && section.rules.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {section.rules.map((rule) => (
                    <li key={rule} style={{ fontSize: "0.86rem", color: "#475569", lineHeight: 1.5 }}>
                      {rule}
                    </li>
                  ))}
                </ul>
              ) : null}

              {section.faqs && section.faqs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {section.faqs.map((faq) => (
                    <details key={faq.q} style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                      <summary style={{ fontSize: "0.86rem", fontWeight: 700, color: "#1e293b", cursor: "pointer" }}>
                        {faq.q}
                      </summary>
                      <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.55, margin: "6px 0 0 0" }}>
                        {faq.a}
                      </p>
                    </details>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>

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
