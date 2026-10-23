import type { ReactNode } from "react";

/*
 * MODÈLES DE DOCUMENTS LÉGAUX.
 * Rédigés pour coller au fonctionnement réel de l'app, mais ils ne remplacent
 * pas la relecture d'un avocat. Tout ce qui est entre [crochets] est à compléter.
 */

const H = ({ id, children }: { id?: string; children: ReactNode }) => (
  <h2 id={id} className="font-display mt-8 scroll-mt-20 text-xl font-bold">{children}</h2>
);
const P = ({ children }: { children: ReactNode }) => <p className="mt-3">{children}</p>;

export const LEGAL_DOCS: Record<string, { title: string; updated: string; body: ReactNode }> = {
  mentions: {
    title: "Mentions légales",
    updated: "1er octobre 2026",
    body: (
      <>
        <H>Éditeur</H>
        <P>
          Studeals est édité par [RAISON SOCIALE], [FORME : SAS / SASU / EI] au capital de [MONTANT] €, immatriculée au
          RCS de [VILLE] sous le numéro [SIREN], siège social : [ADRESSE]. N° de TVA intracommunautaire : [NUMÉRO].
        </P>
        <P>Directeur de la publication : [PRÉNOM NOM]. Contact : [EMAIL DE CONTACT], [TÉLÉPHONE].</P>
        <H>Hébergement</H>
        <P>
          Application hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Base de données
          hébergée par Supabase Inc. dans la région [UE : Francfort / Paris].
        </P>
        <H>Paiements</H>
        <P>
          Les paiements sont traités par Stripe Payments Europe Ltd. Studeals ne conserve aucune donnée de carte
          bancaire. Les fonds des vendeurs sont versés via Stripe Connect.
        </P>
        <H>Point de contact unique (DSA)</H>
        <P>
          Autorités et utilisateurs peuvent joindre Studeals à [EMAIL DSA], en français ou en anglais.
        </P>
      </>
    ),
  },

  cgu: {
    title: "Conditions générales d'utilisation",
    updated: "1er octobre 2026",
    body: (
      <>
        <H>1. Ce qu&apos;est Studeals</H>
        <P>
          Studeals est une plateforme en ligne de mise en relation entre particuliers âgés de 18 à 25 ans, pour vendre
          et acheter des objets d&apos;occasion, signaler des chambres en colocation, proposer de petits services et
          partager des sorties. Studeals est un opérateur de plateforme au sens de l&apos;article L111-7 du Code de la
          consommation : Studeals n&apos;est ni vendeur, ni acheteur, ni prestataire, ni bailleur, et n&apos;est pas
          partie aux contrats conclus entre membres.
        </P>

        <H>2. Qui peut s&apos;inscrire</H>
        <P>
          Pour utiliser Studeals, tu dois avoir entre 18 et 25 ans, agir à titre personnel et non professionnel, et
          n&apos;avoir qu&apos;un seul compte. Vendre, acheter, publier une mission ou y répondre exige le Badge de
          Confiance, obtenu après vérification de ta pièce d&apos;identité et d&apos;un selfie par notre prestataire
          Stripe Identity. Ta date de naissance est lue sur le document. Les professionnels, revendeurs, agences et
          comptes multiples sont interdits. Chaque membre est limité à 20 annonces actives.
        </P>

        <H id="particuliers">3. Ventes entre particuliers</H>
        <P>
          Les vendeurs sont des particuliers. Le droit de la consommation, notamment la garantie légale de conformité
          et le droit de rétractation, ne s&apos;applique donc pas à ces ventes. La garantie des vices cachés du Code
          civil reste applicable. Pour te protéger, chaque paiement passe par le séquestre décrit à l&apos;article 5.
        </P>

        <H id="classement">4. Classement des annonces</H>
        <P>
          Les annonces sont affichées par ville. Les annonces marquées « À liquider d&apos;urgence » apparaissent en
          premier, puis les plus récentes. Les missions SOS apparaissent avant les autres missions. Aucun membre ne peut
          payer pour être mieux placé. Les annonces signalées par au moins trois membres sont masquées en attendant leur
          examen.
        </P>

        <H id="sequestre">5. Paiement et séquestre</H>
        <P>
          Le paiement s&apos;effectue dans l&apos;application, par carte, Apple Pay ou Google Pay, via Stripe. Les fonds
          sont conservés par Stripe pour le compte de Studeals jusqu&apos;à la remise. L&apos;acheteur reçoit un code à
          4 chiffres qu&apos;il communique au vendeur au moment de la remise en main propre, après avoir vérifié
          l&apos;objet ou constaté la fin de la mission. La saisie de ce code par le vendeur déclenche le versement,
          diminué de la commission Studeals de [8] % du prix, sur son compte bancaire.
        </P>
        <P>
          Le vendeur ne doit remettre l&apos;objet qu&apos;en échange du code. Sans code ni litige ouvert dans les 14
          jours suivant le paiement, l&apos;acheteur est remboursé intégralement et l&apos;annonce est remise en ligne. Un
          rappel est envoyé aux deux parties au 7e jour. Après 5 codes erronés, la transaction est bloquée et doit passer
          par la procédure de litige.
        </P>
        <P>Tout paiement en dehors de Studeals se fait à tes risques : le séquestre et la procédure de litige ne s&apos;appliquent plus.</P>

        <H id="litiges">6. Litiges</H>
        <P>
          Tant que l&apos;argent est bloqué, l&apos;acheteur comme le vendeur peut utiliser le bouton « Signaler un
          problème » (absence de l&apos;autre partie, objet non conforme ou endommagé, code non donné, mission non
          réalisée). Les fonds restent bloqués pendant l&apos;examen. L&apos;équipe Studeals peut demander des
          éléments (photos, messages) et rend une décision motivée, en principe sous 72 heures : remboursement de
          l&apos;acheteur, versement au vendeur, ou reprise normale de la transaction si le litige est infondé. Cette
          décision ne prive aucune des parties de son droit de saisir un médiateur ou les tribunaux.
        </P>

        <H>7. Colocation</H>
        <P>
          L&apos;espace Colocation sert uniquement à signaler une chambre libre ou à chercher un·e colocataire. Aucun
          paiement n&apos;y transite. Le bail, le dépôt de garantie et les loyers se règlent directement avec le
          propriétaire ou son mandataire. Sont interdits : la sous-location sans l&apos;accord écrit du bailleur (article
          8 de la loi du 6 juillet 1989), la demande de « frais de reprise » ou de pas-de-porte, et toute demande
          d&apos;acompte avant visite.
        </P>

        <H>8. Missions et coups de main</H>
        <P>
          Les missions sont des services ponctuels entre particuliers. Le membre qui réalise une mission agit de façon
          indépendante, sans lien de subordination avec le demandeur ni avec Studeals. Il lui appartient de respecter
          ses obligations fiscales et sociales, notamment de déclarer ses revenus et, en cas d&apos;activité régulière,
          d&apos;adopter un statut adapté (par exemple micro-entrepreneur). Les activités réglementées (transport de
          personnes, garde d&apos;enfants, soins, etc.) sont interdites.
        </P>

        <H>9. Contenus et comportements interdits</H>
        <P>
          Sont notamment interdits : les objets illégaux, contrefaits, volés, dangereux ou soumis à réglementation
          (armes, médicaments, alcool, tabac, animaux), les contenus haineux, violents, sexuels ou trompeurs, le
          harcèlement, la collecte de données d&apos;autres membres, et le contournement du paiement Studeals.
        </P>

        <H id="moderation">10. Signalement et modération</H>
        <P>
          Tout membre peut signaler une annonce, une mission, un message ou un profil depuis le bouton « Signaler ».
          Chaque signalement est examiné par une personne de l&apos;équipe. Lorsqu&apos;un contenu est retiré ou un compte
          suspendu, l&apos;auteur en est informé avec les motifs de la décision et peut la contester en écrivant à
          [EMAIL SUPPORT]. En cas d&apos;abus répétés, Studeals peut suspendre ou fermer un compte. Les contenus
          manifestement illicites sont signalés aux autorités compétentes.
        </P>

        <H id="fiscal">11. Obligations fiscales</H>
        <P>
          Conformément à l&apos;article 242 bis du Code général des impôts, Studeals t&apos;adresse chaque année, avant
          le 31 janvier, un récapitulatif des montants perçus via l&apos;application. En application de la directive
          européenne DAC7, Studeals transmet chaque année à l&apos;administration fiscale l&apos;identité et les revenus
          des membres ayant réalisé au moins 30 ventes ou plus de 2 000 € de ventes, ainsi que de tous les membres
          rémunérés pour des missions. Ces membres doivent renseigner leurs informations fiscales dans leur profil. À
          défaut, après deux relances, Studeals peut suspendre les versements ou le compte.
        </P>
        <P>
          Pour en savoir plus sur tes obligations : impots.gouv.fr (particuliers vendant sur des plateformes) et
          urssaf.fr.
        </P>

        <H>12. Studeals+ et Nightlife</H>
        <P>
          Les check-ins « J&apos;y vais ce soir » sont anonymes : seuls des totaux sont affichés. L&apos;abonnement
          Studeals+ est régi par les <a href="/legal/cgv" className="underline">conditions générales de vente</a>. Les
          réductions sont accordées par les établissements partenaires, sous leur responsabilité. Consomme avec
          modération.
        </P>

        <H>13. Responsabilité</H>
        <P>
          Studeals met tout en œuvre pour assurer la sécurité de la plateforme mais ne garantit pas la qualité des objets,
          l&apos;exactitude des annonces ni l&apos;exécution des missions. Rencontre les autres membres dans des lieux
          publics. Studeals n&apos;est pas responsable des dommages survenus lors des rencontres entre membres, sauf faute
          de sa part.
        </P>

        <H>14. Données personnelles</H>
        <P>
          Voir la <a href="/legal/confidentialite" className="underline">politique de confidentialité</a>.
        </P>

        <H>15. Modifications, résiliation, droit applicable</H>
        <P>
          Tu peux supprimer ton compte à tout moment depuis ton profil ou en écrivant à [EMAIL SUPPORT], une fois tes
          transactions en cours terminées. Studeals peut modifier ces CGU ; tu en seras informé·e et devras les accepter
          à nouveau pour continuer. Les présentes CGU sont soumises au droit français. En cas de différend avec
          Studeals, tu peux recourir gratuitement au médiateur de la consommation [NOM ET COORDONNÉES DU MÉDIATEUR].
        </P>
      </>
    ),
  },

  cgv: {
    title: "Conditions générales de vente — Studeals+",
    updated: "1er octobre 2026",
    body: (
      <>
        <H>1. Objet</H>
        <P>
          Les présentes conditions régissent l&apos;abonnement Studeals+ vendu par [RAISON SOCIALE] (voir mentions
          légales) et la commission prélevée sur les transactions entre membres.
        </P>
        <H>2. Contenu de Studeals+</H>
        <P>
          Studeals+ donne accès, dans la ville choisie, à l&apos;affluence détaillée des établissements partenaires et
          aux réductions qu&apos;ils proposent. La liste des partenaires et des offres évolue ; Studeals ne garantit pas
          un nombre minimal de partenaires ou d&apos;offres.
        </P>
        <H>3. Prix et paiement</H>
        <P>
          4,99 € TTC par mois, prélevés à la souscription puis chaque mois à date anniversaire, via Stripe. Le prix peut
          évoluer ; tout changement est annoncé au moins 30 jours à l&apos;avance et tu peux résilier avant son
          application.
        </P>
        <H>4. Droit de rétractation</H>
        <P>
          Tu disposes de 14 jours à compter de la souscription pour te rétracter (article L221-18 du Code de la
          consommation). Si tu demandes l&apos;accès immédiat au service, tu reconnais que la rétractation donnera lieu à
          un remboursement au prorata de la période non utilisée. Pour te rétracter : [EMAIL SUPPORT] ou le formulaire
          type disponible sur demande.
        </P>
        <H>5. Résiliation</H>
        <P>
          Résiliation à tout moment, en quelques clics, depuis ton profil (« Gérer ou résilier »). Elle prend effet à la
          fin de la période mensuelle en cours ; aucun mois entamé n&apos;est facturé en plus.
        </P>
        <H>6. Commission sur les transactions</H>
        <P>
          Pour chaque vente ou mission payée via Studeals, une commission de [8] % du montant est déduite du versement au
          vendeur ou au prestataire. L&apos;acheteur paie le prix affiché, sans frais supplémentaires.
        </P>
        <H>7. Réclamations et médiation</H>
        <P>
          Réclamations : [EMAIL SUPPORT]. À défaut de solution amiable, tu peux saisir gratuitement le médiateur de la
          consommation [NOM, ADRESSE, SITE] ou la plateforme européenne de règlement en ligne des litiges.
        </P>
      </>
    ),
  },

  confidentialite: {
    title: "Politique de confidentialité",
    updated: "1er octobre 2026",
    body: (
      <>
        <H>Responsable du traitement</H>
        <P>[RAISON SOCIALE], [ADRESSE]. Contact données personnelles : [EMAIL DPO / CONTACT RGPD].</P>

        <H>Données collectées et pourquoi</H>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/15">
                <th className="py-2 pr-3">Données</th><th className="py-2 pr-3">Finalité</th>
                <th className="py-2 pr-3">Base légale</th><th className="py-2">Durée</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Email, téléphone, ville</td><td className="py-2 pr-3">Compte, connexion, notifications</td><td className="py-2 pr-3">Contrat</td><td className="py-2">Durée du compte + 1 an</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Résultat de vérification, date de naissance</td><td className="py-2 pr-3">Badge de Confiance, contrôle 18-25 ans, lutte contre la fraude</td><td className="py-2 pr-3">Intérêt légitime</td><td className="py-2">Durée du compte</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Pièce d&apos;identité et selfie</td><td className="py-2 pr-3">Vérification d&apos;identité</td><td className="py-2 pr-3">Intérêt légitime</td><td className="py-2">Conservés par Stripe Identity selon sa politique ; jamais stockés par Studeals</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Annonces, messages, photos</td><td className="py-2 pr-3">Fonctionnement du service, litiges, modération</td><td className="py-2 pr-3">Contrat</td><td className="py-2">Durée du compte ; messages 1 an après la dernière transaction</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Transactions</td><td className="py-2 pr-3">Paiement, comptabilité</td><td className="py-2 pr-3">Obligation légale</td><td className="py-2">10 ans</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Identité fiscale, adresse, numéro fiscal</td><td className="py-2 pr-3">Déclaration DAC7 à l&apos;administration fiscale</td><td className="py-2 pr-3">Obligation légale</td><td className="py-2">10 ans</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Position approximative (≈100 m)</td><td className="py-2 pr-3">Afficher la zone d&apos;une annonce</td><td className="py-2 pr-3">Consentement</td><td className="py-2">Durée de l&apos;annonce</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2 pr-3">Check-ins Nightlife</td><td className="py-2 pr-3">Statistiques anonymes d&apos;affluence</td><td className="py-2 pr-3">Consentement (action volontaire)</td><td className="py-2">48 heures, puis agrégés</td></tr>
              <tr><td className="py-2 pr-3">Signalements</td><td className="py-2 pr-3">Modération (DSA)</td><td className="py-2 pr-3">Obligation légale</td><td className="py-2">2 ans</td></tr>
            </tbody>
          </table>
        </div>

        <H>Destinataires</H>
        <P>
          Sous-traitants : Supabase (hébergement des données, [région UE]), Vercel (hébergement de l&apos;application),
          Stripe (paiements et vérification d&apos;identité), Resend (emails), [Twilio] (SMS). Certains sont établis aux
          États-Unis ; les transferts sont encadrés par le Data Privacy Framework ou des clauses contractuelles types.
          Administration fiscale (DAC7). Autorités judiciaires sur réquisition. Aucune donnée n&apos;est vendue ni
          utilisée pour de la publicité.
        </P>

        <H>Tes droits</H>
        <P>
          Accès, rectification, effacement, limitation, portabilité, opposition, et directives post-mortem. Écris à
          [EMAIL CONTACT RGPD] ; réponse sous un mois. Tu peux aussi saisir la CNIL (cnil.fr).
        </P>

        <H>Cookies</H>
        <P>
          Studeals n&apos;utilise que des cookies strictement nécessaires (session de connexion, ville choisie). Aucun
          cookie publicitaire ni de mesure d&apos;audience tierce : aucun bandeau de consentement n&apos;est donc requis.
          [À revoir si un outil d&apos;analytics est ajouté.]
        </P>
      </>
    ),
  },
};
