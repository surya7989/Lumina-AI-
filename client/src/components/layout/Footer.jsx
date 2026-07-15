import { useState, useEffect } from 'react';
import { Globe, MessageCircle, Code2, Play, Send } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';

const footerSections = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Press'],
  },
  {
    title: 'Support',
    links: ['Documentation', 'Tutorials', 'API Reference', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
  },
];

const socialLinks = [
  { icon: Globe, href: '#', label: 'LinkedIn' },
  { icon: MessageCircle, href: '#', label: 'Twitter' },
  { icon: Code2, href: '#', label: 'GitHub' },
  { icon: Play, href: '#', label: 'YouTube' },
];

export default function Footer() {
  const { settings, loadSettings } = useSettingsStore();
  const [email, setEmail] = useState('');
  const siteName = settings?.siteName || 'AI Learning Platform';

  useEffect(() => {
    if (!settings) loadSettings();
  }, []);

  return (
    <footer className="relative bg-gray-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black font-bold text-sm">AI</span>
              </div>
              <span className="text-lg font-bold text-white">
                {siteName}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Empowering the next generation of AI developers with hands-on learning.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Subscribe to newsletter"
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 w-64"
              />
              <button className="p-2 rounded-lg bg-white text-black hover:bg-gray-200 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
