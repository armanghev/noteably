import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          <header className="mb-16">
            <h1 className="text-4xl md:text-5xl font-serif mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground italic text-lg">
              Last updated February 21, 2026
            </p>
          </header>

          <div className="prose prose-invert prose-primary max-w-none space-y-8 text-muted-foreground/90 leading-relaxed">
            <section>
              <p>
                This Privacy Notice for Noteably ("
                <strong className="text-foreground">we</strong>," "
                <strong className="text-foreground">us</strong>," or "
                <strong className="text-foreground">our</strong>"), describes
                how and why we might access, collect, store, use, and/or share
                ("
                <strong className="text-foreground">process</strong>") your
                personal information when you use our services ("
                <strong className="text-foreground">Services</strong>"),
                including when you:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>
                  Visit our website at{" "}
                  <a
                    href="https://noteably-ai.vercel.app/"
                    className="text-primary hover:underline"
                  >
                    https://noteably-ai.vercel.app/
                  </a>{" "}
                  or any website of ours that links to this Privacy Notice
                </li>
                <li>
                  Engage with us in other related ways, including any marketing
                  or events
                </li>
              </ul>
            </section>

            <section className="bg-muted/30 p-8 rounded-2xl border border-primary/10">
              <h2 className="text-2xl font-serif text-foreground mb-4">
                Questions or concerns?
              </h2>
              <p>
                Reading this Privacy Notice will help you understand your
                privacy rights and choices. We are responsible for making
                decisions about how your personal information is processed. If
                you do not agree with our policies and practices, please do not
                use our Services. If you still have any questions or concerns,
                please contact us at our{" "}
                <Link to="/contact-us" className="text-primary hover:underline">
                  Contact Page
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                1. WHAT INFORMATION DO WE COLLECT?
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium text-foreground mb-3">
                    Personal information you disclose to us
                  </h3>
                  <p className="italic mb-4">
                    In Short: We collect personal information that you provide
                    to us.
                  </p>
                  <p>
                    We collect personal information that you voluntarily provide
                    to us when you register on the Services, express an interest
                    in obtaining information about us or our products and
                    Services, when you participate in activities on the
                    Services, or otherwise when you contact us.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-foreground mb-3">
                    Information automatically collected
                  </h3>
                  <p className="italic mb-4">
                    In Short: Some information — such as your Internet Protocol
                    (IP) address and/or browser and device characteristics — is
                    collected automatically when you visit our Services.
                  </p>
                  <p>
                    We automatically collect certain information when you visit,
                    use, or navigate the Services. This information does not
                    reveal your specific identity (like your name or contact
                    information) but may include device and usage information,
                    such as your IP address, browser and device characteristics,
                    operating system, language preferences, referring URLs,
                    device name, country, location, information about how and
                    when you use our Services, and other technical information.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-foreground mb-3">
                    Google API
                  </h3>
                  <p>
                    Our use of information received from Google APIs will adhere
                    to{" "}
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Google API Services User Data Policy
                    </a>
                    , including the{" "}
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy#limited-use"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Limited Use requirements
                    </a>
                    .
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                2. HOW DO WE PROCESS YOUR INFORMATION?
              </h2>
              <p className="italic mb-4">
                In Short: We process your information to provide, improve, and
                administer our Services, communicate with you, for security and
                fraud prevention, and to comply with law.
              </p>
              <p>
                We process your personal information for a variety of reasons,
                depending on how you interact with our Services, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>
                  To facilitate account creation and authentication and
                  otherwise manage user accounts.
                </li>
                <li>
                  To request feedback and to contact you about your use of our
                  Services.
                </li>
                <li>
                  To evaluate and improve our Services, products, marketing, and
                  your experience.
                </li>
                <li>To identify usage trends.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
              </h2>
              <p className="italic mb-4">
                In Short: We may share information in specific situations
                described in this section and/or with the following third
                parties.
              </p>
              <p>
                We may need to share your personal information in the following
                situations:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>
                  <strong className="text-foreground">
                    Business Transfers.
                  </strong>{" "}
                  We may share or transfer your information in connection with,
                  or during negotiations of, any merger, sale of company assets,
                  financing, or acquisition of all or a portion of our business
                  to another company.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                4. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
              </h2>
              <p className="italic mb-4">
                In Short: We offer products, features, or tools powered by
                artificial intelligence, machine learning, or similar
                technologies.
              </p>
              <p>
                As part of our Services, we offer products, features, or tools
                powered by artificial intelligence, machine learning, or similar
                technologies (collectively, "AI Products"). These tools are
                designed to enhance your experience and provide you with
                innovative solutions.
              </p>
              <p className="mt-4">
                We provide the AI Products through third-party service providers
                ("AI Service Providers"), including{" "}
                <strong className="text-foreground">AssemblyAI</strong> and{" "}
                <strong className="text-foreground">Google Cloud AI</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                5. HOW DO WE HANDLE YOUR SOCIAL LOGINS?
              </h2>
              <p className="italic mb-4">
                In Short: If you choose to register or log in to our Services
                using a social media account, we may have access to certain
                information about you.
              </p>
              <p>
                Our Services offer you the ability to register and log in using
                your third-party social media account details (like your
                Facebook or X logins). Where you choose to do this, we will
                receive certain profile information about you from your social
                media provider.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                6. HOW LONG DO WE KEEP YOUR INFORMATION?
              </h2>
              <p className="italic mb-4">
                In Short: We keep your information for as long as necessary to
                fulfill the purposes outlined in this Privacy Notice unless
                otherwise required by law.
              </p>
              <p>
                No purpose in this notice will require us keeping your personal
                information for longer than one (1) month past the termination
                of the user's account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                7. HOW DO WE KEEP YOUR INFORMATION SAFE?
              </h2>
              <p className="italic mb-4">
                In Short: We aim to protect your personal information through a
                system of organizational and technical security measures.
              </p>
              <p>
                We have implemented appropriate and reasonable technical and
                organizational security measures designed to protect the
                security of any personal information we process. However, no
                electronic transmission over the Internet can be guaranteed to
                be 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                8. WHAT ARE YOUR PRIVACY RIGHTS?
              </h2>
              <p className="italic mb-4">
                In Short: You may review, change, or terminate your account at
                any time.
              </p>
              <p>
                If we are relying on your consent to process your personal
                information, you have the right to withdraw your consent at any
                time. You can do so by contacting us using the details provided
                below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                9. CONTROLS FOR DO-NOT-TRACK FEATURES
              </h2>
              <p>
                Most web browsers and some mobile operating systems and mobile
                applications include a Do-Not-Track ("DNT") feature or setting
                you can activate to signal your privacy preference. At this
                stage, we do not currently respond to DNT browser signals.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                10. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
              </h2>
              <p className="italic mb-4">
                In Short: If you are a resident of certain US states, you may
                have specific rights regarding your personal information.
              </p>
              <p>
                We collect identifiers such as contact details, online
                identifiers, and account login information. We honor Global
                Privacy Control (GPC) signals.
              </p>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-serif text-foreground mb-6 underline decoration-primary/30 underline-offset-8">
                11. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
              </h2>
              <p>
                If you have questions or comments about this notice, you may
                contact us via our{" "}
                <Link to="/contact-us" className="text-primary hover:underline">
                  Contact Page
                </Link>
                .
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
