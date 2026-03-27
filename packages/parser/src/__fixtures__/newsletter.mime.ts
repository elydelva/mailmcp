/**
 * Minimal but realistic newsletter MIME fixture.
 * Reproduces the patterns observed in real emails:
 * - multipart/alternative with text/plain and text/html parts
 * - quoted-printable encoding with non-ASCII characters
 * - zero-width characters and HTML entities in the HTML part
 * - tracking links (click. domain, utm_ params, unsub_center)
 * - editorial link (legitimate URL worth keeping)
 * - footer noise (unsubscribe, privacy policy, company address)
 */
export const NEWSLETTER_MIME = [
  "From: Marie de Fever <hello@email.feverup.com>",
  "To: ely.delva@icloud.com",
  "Subject: =?UTF-8?Q?D=C3=A9couvrez_notre_spectacle?=",
  "Date: Mon, 17 Nov 2025 17:28:03 +0000",
  "MIME-Version: 1.0",
  "Content-Type: multipart/alternative; boundary=----=_Part_42",
  "",
  "------=_Part_42",
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "D=C3=A9couvrez notre nouveau spectacle =C3=A0 Paris !=0D=0A=0D=0APrenez vos billets maintenant.",
  "",
  "------=_Part_42",
  "Content-Type: text/html; charset=UTF-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "<!DOCTYPE html>",
  "<html>",
  "<head><style>body{font-family:sans-serif}</style></head>",
  "<body>",
  "  <header>&zwnj; &#8199;&zwnj; &#8199;&zwnj;</header>",
  "  <main>",
  "    <h1>D=C3=A9couvrez notre spectacle</h1>",
  "    <p>Un spectacle =C3=A9blouis=C3=A0nt vous attend =C3=A0 Paris. Venez vivre une exp=C3=A9rience inoubliable avec votre famille et vos amis.</p>",
  '    <a href=3D"https://click.email.feverup.com/?qs=3Dabc123tracking">R=C3=A9server maintenant</a>',
  '    <p>En savoir plus sur <a href=3D"https://feverup.com/paris">Fever Paris</a></p>',
  "  </main>",
  "  <footer>",
  "    <p>=C2=A9 2025 Fever Labs, Inc. 50 Greene St, New York.</p>",
  '    <a href=3D"https://click.email.feverup.com/unsub_center.aspx?qs=3Dxyz">Se d=C3=A9sabonner</a>',
  '    <a href=3D"https://click.email.feverup.com/?qs=3Dprivacy">Politique de confidentialit=C3=A9</a>',
  "  </footer>",
  "</body>",
  "</html>",
  "",
  "------=_Part_42--",
].join("\r\n");
