#!/usr/bin/env python3
"""Generate the YK1K brand site pages from shared chrome + content blocks."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def asset(path: str, depth: int) -> str:
    return ("../" * depth) + path


def chrome(title: str, description: str, active: str, depth: int, body: str, body_class: str = "") -> str:
    a = lambda p: asset(p, depth)
    def nav_current(key: str) -> str:
        return ' aria-current="page"' if key == active else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="{a('css/styles.css')}" />
  <link rel="icon" href="{a('assets/logo.jpg')}" />
</head>
<body class="{body_class}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-bg" aria-hidden="true"></div>
  <div class="announce">
    Join the Kings List — get <a href="{a('pages/vip.html')}">$10 off + early access</a> to limited drops.
  </div>
  <header class="nav">
    <div class="container nav-inner">
      <a class="brand" href="{a('index.html')}" aria-label="YK1K home">
        <img src="{a('assets/logo.jpg')}" alt="YK1K" />
        <div class="brand-word">YK<span>1</span>K</div>
      </a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>
      <ul class="nav-links" id="site-nav" data-nav-links>
        <li><a href="{a('pages/shop-new.html')}"{nav_current('new')}>New Drop</a></li>
        <li><a href="{a('pages/school-house.html')}"{nav_current('school')}>School House</a></li>
        <li><a href="{a('pages/dallas.html')}"{nav_current('dallas')}>Dallas</a></li>
        <li><a href="{a('pages/originals.html')}"{nav_current('originals')}>Originals</a></li>
        <li><a href="{a('pages/our-story.html')}"{nav_current('story')}>Our Story</a></li>
        <li><a href="{a('pages/custom.html')}"{nav_current('custom')}>Custom</a></li>
        <li><a class="nav-cta" href="{a('pages/vip.html')}"{nav_current('vip')}>Join VIP</a></li>
      </ul>
    </div>
  </header>
  <main id="main">
{body}
  </main>
  <footer class="footer">
    <div class="container footer-grid">
      <div>
        <p class="footer-brand">YK<span>1</span>K</p>
        <p style="color:var(--muted);max-width:22rem;margin:0 0 1rem;">
          Dallas-born legacy streetwear celebrating culture, schools, cities, history, and the people who built them.
        </p>
        <p style="color:var(--paper-dim);font-size:0.9rem;margin:0;">
          4466 S Marsalis Ave, Dallas, TX 75216<br />
          <a href="mailto:youngkingsonline@gmail.com">youngkingsonline@gmail.com</a><br />
          <a href="tel:+12144176839">214.417.6839</a>
        </p>
      </div>
      <div>
        <h3>Shop</h3>
        <ul>
          <li><a href="{a('pages/shop-new.html')}">New Drop</a></li>
          <li><a href="{a('pages/originals.html')}">YK1K Originals</a></li>
          <li><a href="{a('pages/dallas.html')}">YK1K Dallas</a></li>
          <li><a href="{a('pages/school-house.html')}">School House</a></li>
          <li><a href="{a('collections/grambling.html')}">Grambling</a></li>
        </ul>
      </div>
      <div>
        <h3>Company</h3>
        <ul>
          <li><a href="{a('pages/about.html')}">About YK1K</a></li>
          <li><a href="{a('pages/our-story.html')}">Our Story</a></li>
          <li><a href="{a('pages/press.html')}">Press</a></li>
          <li><a href="{a('pages/collaborations.html')}">Collaborations</a></li>
          <li><a href="{a('pages/wholesale.html')}">Wholesale</a></li>
          <li><a href="{a('pages/custom.html')}">Custom Orders</a></li>
          <li><a href="{a('pages/school-orders.html')}">School / Org Orders</a></li>
        </ul>
      </div>
      <div>
        <h3>Help</h3>
        <ul>
          <li><a href="{a('pages/faq.html')}">FAQ</a></li>
          <li><a href="{a('pages/shipping.html')}">Shipping</a></li>
          <li><a href="{a('pages/sizing.html')}">Sizing</a></li>
          <li><a href="{a('pages/track-order.html')}">Track Order</a></li>
          <li><a href="{a('policies/refund.html')}">Refund Policy</a></li>
          <li><a href="{a('pages/contact.html')}">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 YK1K · Young Kings Clothing · Est. 2014</span>
      <span>Culture. Legacy. City. School.</span>
    </div>
  </footer>
  <script src="{a('js/site.js')}"></script>
</body>
</html>
"""


PAGES = {}

PAGES["index.html"] = {
    "title": "YK1K — Made From Legacy. Built For The Culture. Born In Dallas.",
    "description": "Dallas-born legacy streetwear celebrating culture, schools, cities, history, and the people who built them.",
    "active": "home",
    "depth": 0,
    "body": """
    <section class="hero">
      <div class="hero-media" aria-hidden="true">
        <img src="assets/product-8.jpg" alt="" />
      </div>
      <div class="container">
        <p class="hero-brand">YK<span>1</span>K</p>
        <div class="hero-lines">
          <p>Made From Legacy.</p>
          <p>Built For The Culture.</p>
          <p>Born In Dallas.</p>
        </div>
        <p class="hero-support">
          Not another streetwear company — a Dallas-born legacy brand for schools, cities, history, and the people who built them.
        </p>
        <div class="btn-row">
          <a class="btn btn-gold" href="pages/shop-new.html">Shop New Drop</a>
          <a class="btn btn-ghost" href="pages/school-house.html">Shop Your School</a>
        </div>
        <div class="pillars">
          <span>Culture</span>
          <span>Legacy</span>
          <span>City</span>
          <span>School</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <div>
            <p class="section-kicker">Best Sellers</p>
            <h2 class="section-title">What the culture keeps wearing</h2>
            <p class="section-sub">Hero pieces with depth — Dallas pride, school legacy, and YK1K originals.</p>
          </div>
          <a class="link-more" href="pages/shop-new.html">View all →</a>
        </div>
        <div class="product-grid reveal">
          <a class="product" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener">
            <div class="product-media"><img src="assets/product-4.jpg" alt="Dallas 214 Acid Black shirt" /></div>
            <div class="product-meta"><h3>Dallas 214 Acid Black</h3><p>$50</p></div>
          </a>
          <a class="product" href="https://www.yk1kllc.com/collections/shorts" target="_blank" rel="noopener">
            <div class="product-media"><img src="assets/product-13.jpg" alt="Grambling basketball shorts" /></div>
            <div class="product-meta"><h3>Grambling Basketball Shorts</h3><p>$50</p></div>
          </a>
          <a class="product" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener">
            <div class="product-media"><img src="assets/product-8.jpg" alt="This Is Dallas varsity jacket" /></div>
            <div class="product-meta"><h3>This Is Dallas Varsity</h3><p>From $125</p></div>
          </a>
          <a class="product" href="https://www.yk1kllc.com/collections/hats" target="_blank" rel="noopener">
            <div class="product-media"><img src="assets/product-1.jpg" alt="This Is Dallas trucker hat" /></div>
            <div class="product-meta"><h3>This Is Dallas Trucker</h3><p>$30</p></div>
          </a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <div>
            <p class="section-kicker">Shop Your City</p>
            <h2 class="section-title">City pride you can wear</h2>
            <p class="section-sub">Souvenir energy with real roots — starting in Texas, expanding city by city.</p>
          </div>
        </div>
        <div class="lane-grid reveal">
          <a class="lane" href="pages/dallas.html">
            <div class="lane-bg" style="background-image:url('assets/product-6.jpg')"></div>
            <div>
              <h3>Dallas</h3>
              <p>214 · Oak Cliff · South Dallas · legends</p>
            </div>
          </a>
          <a class="lane" href="https://www.yk1kllc.com/collections/houston-merch" target="_blank" rel="noopener">
            <div class="lane-bg" style="background-image:url('assets/product-11.jpg')"></div>
            <div>
              <h3>Houston</h3>
              <p>H-Town capsules &amp; city fits</p>
            </div>
          </a>
          <a class="lane" href="pages/collaborations.html">
            <div class="lane-bg" style="background-image:url('assets/product-7.jpg')"></div>
            <div>
              <h3>Next Cities</h3>
              <p>Atlanta · NOLA · Memphis — coming</p>
            </div>
          </a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <div>
            <p class="section-kicker">YK1K School House™</p>
            <h2 class="section-title">Rep Your School</h2>
            <p class="section-sub">HBCUs, colleges, and Dallas high schools — choose your house, then build the fit.</p>
          </div>
          <a class="link-more" href="pages/school-house.html">Enter School House →</a>
        </div>
        <div class="school-grid reveal">
          <div class="school-block">
            <h3>HBCUs</h3>
            <ul>
              <li><a href="collections/grambling.html">Grambling State</a></li>
              <li><a href="https://www.yk1kllc.com/collections/famu" target="_blank" rel="noopener">FAMU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/jackson-state-university" target="_blank" rel="noopener">Jackson State</a></li>
              <li><a href="https://www.yk1kllc.com/collections/southern-university" target="_blank" rel="noopener">Southern University</a></li>
              <li><a href="https://www.yk1kllc.com/collections/howard-university" target="_blank" rel="noopener">Howard</a></li>
              <li><a href="pages/school-house.html">View all HBCUs →</a></li>
            </ul>
          </div>
          <div class="school-block">
            <h3>Colleges</h3>
            <ul>
              <li><a href="https://www.yk1kllc.com/collections/baylor-university" target="_blank" rel="noopener">Baylor</a></li>
              <li><a href="https://www.yk1kllc.com/collections/lsu" target="_blank" rel="noopener">LSU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/smu-1" target="_blank" rel="noopener">SMU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/university-of-houston" target="_blank" rel="noopener">University of Houston</a></li>
              <li><a href="https://www.yk1kllc.com/collections/texas-christian-university" target="_blank" rel="noopener">TCU</a></li>
              <li><a href="pages/school-house.html">View all colleges →</a></li>
            </ul>
          </div>
          <div class="school-block">
            <h3>Dallas High Schools</h3>
            <ul>
              <li><a href="https://www.yk1kllc.com/collections/carter-cowboys" target="_blank" rel="noopener">Carter Cowboys</a></li>
              <li><a href="https://www.yk1kllc.com/collections/south-oak-cliff" target="_blank" rel="noopener">South Oak Cliff</a></li>
              <li><a href="https://www.yk1kllc.com/collections/lincoln-tigers" target="_blank" rel="noopener">Lincoln Tigers</a></li>
              <li><a href="https://www.yk1kllc.com/collections/skyline-raiders" target="_blank" rel="noopener">Skyline Raiders</a></li>
              <li><a href="https://www.yk1kllc.com/collections/desoto-eagles" target="_blank" rel="noopener">DeSoto Eagles</a></li>
              <li><a href="pages/school-house.html">View all schools →</a></li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container story reveal">
        <figure class="story-portrait">
          <img src="assets/product-7.jpg" alt="YK1K craft and Dallas heritage" />
          <figcaption>Designed &amp; printed at the Pan-African Connection · South Dallas</figcaption>
        </figure>
        <div class="story-copy">
          <p class="section-kicker">The YK1K Story</p>
          <h2>A decade of legacy — not trends.</h2>
          <p>
            Founder Bambata Tyehimba grew up around the Pan-African Connection — African textiles, Civil Rights history, and a family business built to last. YK1K turned that upbringing into streetwear that honors schools, cities, and Black cultural storytelling.
          </p>
          <p>
            Since 2014, the brand has operated from Dallas with an active retail presence, registered trademark protection, and a real supply chain — pieces worn across the culture and covered by D Magazine, Voyage Dallas, and Dallas ISD.
          </p>
          <div class="btn-row">
            <a class="btn btn-gold" href="pages/our-story.html">Read Our Story</a>
            <a class="btn btn-ghost" href="pages/press.html">Press</a>
          </div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        <div>SEEN IN <span>D MAGAZINE</span> · VOYAGE DALLAS · DALLAS ISD · SOUTH DALLAS ROOTS · HBCU CULTURE · FAMILY LEGACY ·</div>
        <div>SEEN IN <span>D MAGAZINE</span> · VOYAGE DALLAS · DALLAS ISD · SOUTH DALLAS ROOTS · HBCU CULTURE · FAMILY LEGACY ·</div>
      </div>
    </div>

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <div>
            <p class="section-kicker">Worn By The Culture</p>
            <h2 class="section-title">Customer fits &amp; reviews</h2>
            <p class="section-sub">Real community proof — names and images used only with permission.</p>
          </div>
        </div>
        <div class="review-grid reveal">
          <blockquote class="review">
            <p>“Quality feels premium and the Dallas pieces actually mean something. Not just another logo tee.”</p>
            <cite>— Kings List member · Dallas</cite>
          </blockquote>
          <blockquote class="review">
            <p>“Came through for homecoming. Shorts + hat looked like a uniform, not random merch.”</p>
            <cite>— Grambling alum</cite>
          </blockquote>
          <blockquote class="review">
            <p>“You can tell it’s rooted. The story hits different when you know where it comes from.”</p>
            <cite>— Oak Cliff</cite>
          </blockquote>
        </div>
      </div>
    </section>

    <section class="vip" id="kings-list">
      <div class="container vip-inner reveal">
        <div>
          <p class="section-kicker">The Kings List</p>
          <h2>Get $10 off + early access to limited drops.</h2>
          <p>
            Join the YK1K VIP List — members see drops before everybody else. No generic “exclusive offers.” Real access.
          </p>
        </div>
        <form class="vip-form" data-vip-form>
          <input type="email" name="email" required placeholder="Email address" aria-label="Email address" />
          <input type="tel" name="sms" placeholder="Mobile for SMS drops (optional)" aria-label="Mobile number" />
          <select name="school" aria-label="School or city">
            <option value="">School / city (optional)</option>
            <option>Dallas</option>
            <option>Houston</option>
            <option>Grambling</option>
            <option>FAMU</option>
            <option>Baylor</option>
            <option>Carter HS</option>
            <option>Other</option>
          </select>
          <button class="btn btn-gold" type="submit">Join The Kings List</button>
          <p class="form-note" data-form-status>VIP members get early drop access and $10 YK1K Cash.</p>
        </form>
      </div>
    </section>
""",
}


def page_hero(kicker: str, title: str, sub: str) -> str:
    return f"""
    <section class="page-hero">
      <div class="container">
        <p class="section-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </section>
"""


PAGES["pages/about.html"] = {
    "title": "About YK1K — Young Kings Clothing",
    "description": "YK1K is Dallas-born legacy streetwear celebrating culture, schools, cities, and history.",
    "active": "story",
    "depth": 1,
    "body": page_hero(
        "About YK1K",
        "Culture. Legacy. City. School.",
        "YK1K (Young Kings Clothing) is a Dallas-born legacy streetwear brand and production company — not another trend cycle.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container prose">
        <p>Founded in 2014 by Bambata Tyehimba, YK1K designs apparel that honors Black cultural storytelling, HBCU and school pride, Dallas neighborhoods, and family legacy rooted in the Pan-African Connection.</p>
        <p>The brand operates online and from a South Dallas retail presence at 4466 S Marsalis Avenue, with an active supply chain spanning originals, city merch, school collections, custom orders, and collaborations.</p>
        <h2>What we make</h2>
        <ul>
          <li><strong>YK1K Originals</strong> — crown, seasonal collections, premium fleece, signature jackets</li>
          <li><strong>YK1K Dallas</strong> — 214, Oak Cliff, South Dallas, neighborhood &amp; music culture</li>
          <li><strong>YK1K School House™</strong> — HBCUs, colleges, Dallas high schools</li>
          <li><strong>YK1K Custom</strong> — organizations, reunions, teams, artists, wholesale</li>
        </ul>
        <div class="btn-row" style="margin-top:2rem">
          <a class="btn btn-gold" href="our-story.html">Our Story</a>
          <a class="btn btn-ghost" href="contact.html">Contact</a>
        </div>
      </div>
    </section>
""",
}

PAGES["pages/our-story.html"] = {
    "title": "Our Story — YK1K",
    "description": "The YK1K founder story: Pan-African Connection, South Dallas roots, and a decade of legacy streetwear.",
    "active": "story",
    "depth": 1,
    "body": page_hero(
        "Our Story",
        "Made from legacy.",
        "Bambata Tyehimba built YK1K to leave a lasting mark — pieces that nod to culture, not just the moment.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container story">
        <figure class="story-portrait">
          <img src="../assets/product-8.jpg" alt="YK1K Dallas varsity craft" />
          <figcaption>South Dallas · Family business · Est. 2014</figcaption>
        </figure>
        <div class="story-copy prose" style="max-width:none">
          <p>Growing up around the Pan-African Connection bookstore and gallery in Cedar Crest, Bambata absorbed African textiles, Civil Rights history, and the discipline of a family business. His father, Bandele, left more than a storefront — he left a tool for the next generation.</p>
          <p>After Carter High School and Tennessee State University football, Bambata taught in Dallas ISD classrooms before fully committing to fashion. YK1K became the vehicle: appliquéd designs, school basketball shorts, satin and leather varsity jackets, Dallas lyric pieces, and HBCU tributes designed and printed at the Pan-African Connection.</p>
          <p>As covered in D Magazine (July 2024), the brand has been worn by artists across Dallas culture — but the mission stays bigger than a fad: legacy you can put on.</p>
          <div class="btn-row">
            <a class="btn btn-gold" href="press.html">Press coverage</a>
            <a class="btn btn-ghost" href="../pages/vip.html">Join The Kings List</a>
          </div>
        </div>
      </div>
    </section>
""",
}

PAGES["pages/faq.html"] = {
    "title": "FAQ — YK1K",
    "description": "Answers about shipping, returns, sizing, custom orders, and School House.",
    "active": "",
    "depth": 1,
    "body": page_hero("Help", "FAQ", "Straight answers on orders, returns, sizing, schools, and custom work.")
    + """
    <section class="section" style="padding-top:0">
      <div class="container faq" style="max-width:44rem">
        <details open>
          <summary>What is your return policy?</summary>
          <p>Eligible unused items with tags may be returned for store credit/exchange within 5 days of delivery, or a full refund within 14 days. Sale/reduced items, intimate wear, exclusive collector items, and gift cards are final sale. A $10–$15 restocking fee applies; customer covers return shipping. See the full Refund Policy for details.</p>
        </details>
        <details>
          <summary>Do you ship internationally?</summary>
          <p>Yes — we ship within the U.S. and to select international destinations. International orders are not eligible for returns/exchanges. Customs fees are the customer’s responsibility.</p>
        </details>
        <details>
          <summary>How long does shipping take?</summary>
          <p>Most orders arrive within about a week depending on inventory. We do not currently offer expedited shipping. During promotions, processing may take longer.</p>
        </details>
        <details>
          <summary>Can I get custom or school group orders?</summary>
          <p>Yes. YK1K Custom handles 25–2,500+ pieces for schools, alumni groups, teams, reunions, churches, artists, and brands. Start at Custom Orders or School / Organization Orders.</p>
        </details>
        <details>
          <summary>Are school designs officially licensed?</summary>
          <p>Licensing varies by school and SKU. We are formalizing licensing/IP compliance across collegiate merchandise as we scale. Contact us for wholesale or campus bookstore inquiries.</p>
        </details>
        <details>
          <summary>How do I join early access drops?</summary>
          <p>Join The Kings List for $10 off and early access to limited drops via email/SMS.</p>
        </details>
      </div>
    </section>
""",
}

PAGES["pages/shipping.html"] = {
    "title": "Shipping — YK1K",
    "description": "YK1K shipping timelines, destinations, and order processing details.",
    "active": "",
    "depth": 1,
    "body": page_hero("Help", "Shipping", "Domestic and international shipping details for YK1K orders.")
    + """
    <section class="section" style="padding-top:0">
      <div class="container prose">
        <div class="policy-callout">
          <strong>Typical arrival:</strong> up to 1 week depending on immediate availability. Expedited shipping is not currently offered.
        </div>
        <p>Orders ship within the United States and to select international destinations. Shipping rates are flat for domestic and international orders.</p>
        <h2>International</h2>
        <p>International orders generally ship USPS First Class International (often 10–15 days after shipment). Customers are responsible for customs duties and taxes. International orders are not eligible for returns or exchanges.</p>
        <h2>Lost or stolen packages</h2>
        <p>Once a package is with the carrier, contact the carrier for lost/stolen claims. YK1K will assist where possible but cannot replace carrier losses free of charge.</p>
        <p><a class="link-more" href="track-order.html">Track an order →</a></p>
      </div>
    </section>
""",
}

PAGES["pages/sizing.html"] = {
    "title": "Sizing — YK1K",
    "description": "YK1K sizing guidance for shirts, shorts, jackets, and hats.",
    "active": "",
    "depth": 1,
    "body": page_hero("Help", "Sizing", "Check the size chart on each product before checkout — especially limited and exclusive pieces.")
    + """
    <section class="section" style="padding-top:0">
      <div class="container prose">
        <p>Fit varies by silhouette (tees, mesh shorts, satin varsity jackets, truckers). Use the product page size chart as the source of truth.</p>
        <h2>Quick guidance</h2>
        <ul>
          <li><strong>Tees:</strong> true to size for a classic fit; size up for oversized streetwear.</li>
          <li><strong>Basketball shorts:</strong> athletic fit with drawstring — check waist range on the product.</li>
          <li><strong>Varsity jackets:</strong> structured; if between sizes, size up for layering.</li>
          <li><strong>Hats:</strong> adjustable snapback / trucker unless noted.</li>
        </ul>
        <p>Need help before you buy? Email <a href="mailto:youngkingsonline@gmail.com">youngkingsonline@gmail.com</a> with the product name and your usual size.</p>
      </div>
    </section>
""",
}

PAGES["pages/track-order.html"] = {
    "title": "Track Order — YK1K",
    "description": "Track your YK1K order status.",
    "active": "",
    "depth": 1,
    "body": page_hero("Help", "Track Order", "Enter your order email and order number. Live checkout tracking continues on the Shopify store.")
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <form class="form-grid" data-inquiry-form style="max-width:28rem">
          <label>Order email<input type="email" name="email" required placeholder="you@email.com" /></label>
          <label>Order number<input type="text" name="order" required placeholder="#1234" /></label>
          <button class="btn btn-gold" type="submit">Look up order</button>
          <p class="form-note" data-form-status>For live tracking links, use the confirmation email from yk1kllc.com checkout or email youngkingsonline@gmail.com.</p>
        </form>
        <p style="margin-top:1.5rem"><a class="link-more" href="https://www.yk1kllc.com/account" target="_blank" rel="noopener">Open store account →</a></p>
      </div>
    </section>
""",
}

PAGES["policies/refund.html"] = {
    "title": "Refund Policy — YK1K",
    "description": "Official YK1K refund, exchange, and final-sale policy.",
    "active": "",
    "depth": 1,
    "body": page_hero("Policies", "Refund Policy", "One policy. Same rules on every page — including Contact.")
    + """
    <section class="section" style="padding-top:0">
      <div class="container prose">
        <div class="policy-callout">
          <strong>Unified policy:</strong> Eligible customers may receive store credit/exchange within 5 days of delivery, or a full refund within 14 days, subject to the conditions below. Sale/reduced items are final sale.
        </div>
        <h2>Final sale</h2>
        <p>All reduced sale items are final sale and are not eligible for returns or exchanges. International orders are not eligible for returns or exchanges. Intimate wear, exclusive collector items, and gift cards cannot be returned.</p>
        <h2>Eligible returns</h2>
        <p>We accept returned items (unless otherwise noted) for store credit/exchange within 5 days of delivery, or a full refund if returned within 14 days. Items must be unused, in original packaging, with original tags attached. A $10–$15 restocking fee applies. Customers cover return shipping.</p>
        <h2>Exchanges</h2>
        <p>Exchanges may include a processing fee of up to $15 per item. Exchanges on limited release and exclusive items are not guaranteed. Worn items are not eligible.</p>
        <h2>How to start a return</h2>
        <p>Email <a href="mailto:youngkingsonline@gmail.com">youngkingsonline@gmail.com</a> for refund or exchange instructions. Exception credits (YK1K E-Gift Code) are processed within 7–10 business days of item delivery to us and are not guaranteed.</p>
        <p>This page is the single source of truth and matches Contact, FAQ, and checkout messaging.</p>
      </div>
    </section>
""",
}

PAGES["pages/contact.html"] = {
    "title": "Contact — YK1K",
    "description": "Contact YK1K for custom orders, booking, and business inquiries.",
    "active": "",
    "depth": 1,
    "body": page_hero(
        "Contact",
        "Talk to the Kings.",
        "Custom orders, booking, wholesale, press, and business inquiries.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container split-2">
        <div class="prose">
          <p><strong>Email:</strong> <a href="mailto:youngkingsonline@gmail.com">youngkingsonline@gmail.com</a><br />
          <strong>Phone:</strong> <a href="tel:+12144176839">214.417.6839</a><br />
          <strong>Studio / store:</strong> 4466 S Marsalis Ave, Dallas, TX 75216</p>
          <div class="policy-callout">
            <strong>Returns:</strong> Eligible unused items may receive store credit/exchange within 5 days of delivery or a full refund within 14 days. Sale items are final. <a href="../policies/refund.html">Read the full Refund Policy</a>.
          </div>
          <p>Need volume? <a href="custom.html">YK1K Custom</a> · <a href="wholesale.html">Wholesale</a> · <a href="school-orders.html">School / Org Orders</a></p>
        </div>
        <form class="form-grid" data-inquiry-form>
          <label>Name<input name="name" required /></label>
          <label>Email<input type="email" name="email" required /></label>
          <label>Topic
            <select name="topic">
              <option>General</option>
              <option>Custom order</option>
              <option>Wholesale</option>
              <option>Press</option>
              <option>Collaboration</option>
              <option>Order support</option>
            </select>
          </label>
          <label>Message<textarea name="message" required></textarea></label>
          <button class="btn btn-gold" type="submit">Send message</button>
          <p class="form-note" data-form-status>We typically respond within 1–2 business days (up to 5 during sales).</p>
        </form>
      </div>
    </section>
""",
}

PAGES["pages/school-house.html"] = {
    "title": "YK1K School House™ — Choose Your School",
    "description": "Enter YK1K School House: HBCUs, colleges, Dallas high schools, bundles, and alumni merch.",
    "active": "school",
    "depth": 1,
    "body": page_hero(
        "YK1K School House™",
        "Choose your school.",
        "Collection → shirts → shorts → hats → varsity → bundles → alumni → custom group order.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="lane-grid reveal" style="margin-bottom:2.5rem">
          <a class="lane" href="#hbcus"><div class="lane-bg" style="background-image:url('../assets/product-13.jpg')"></div><div><h3>HBCUs</h3><p>Heritage, homecoming, legacy packs</p></div></a>
          <a class="lane" href="#colleges"><div class="lane-bg" style="background-image:url('../assets/product-14.jpg')"></div><div><h3>Colleges</h3><p>Texas + national campuses</p></div></a>
          <a class="lane" href="#dallas-hs"><div class="lane-bg" style="background-image:url('../assets/product-11.jpg')"></div><div><h3>Dallas High Schools</h3><p>Local pride that built the brand</p></div></a>
        </div>

        <p class="section-kicker">Homecoming Bundles</p>
        <h2 class="section-title" style="margin-bottom:1.25rem">Raise the fit. Raise AOV.</h2>
        <div class="bundle-grid reveal" style="margin-bottom:3rem">
          <div class="bundle">
            <h3>Homecoming Starter Pack</h3>
            <p>Shirt + shorts — game-day ready.</p>
            <div class="price">From $90</div>
            <a class="btn btn-ghost" href="../collections/grambling.html">Build pack</a>
          </div>
          <div class="bundle">
            <h3>Homecoming Full Fit</h3>
            <p>Shirt + shorts + hat.</p>
            <div class="price">From $120</div>
            <a class="btn btn-ghost" href="../collections/grambling.html">Build pack</a>
          </div>
          <div class="bundle">
            <h3>Legacy Pack</h3>
            <p>Jacket + hat + shirt.</p>
            <div class="price">From $200</div>
            <a class="btn btn-ghost" href="school-orders.html">Group order</a>
          </div>
        </div>

        <div class="school-grid" id="hbcus">
          <div class="school-block">
            <h3>HBCUs</h3>
            <ul>
              <li><a href="../collections/grambling.html">Grambling State University</a></li>
              <li><a href="https://www.yk1kllc.com/collections/famu" target="_blank" rel="noopener">FAMU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/jackson-state-university" target="_blank" rel="noopener">Jackson State</a></li>
              <li><a href="https://www.yk1kllc.com/collections/southern-university" target="_blank" rel="noopener">Southern University</a></li>
              <li><a href="https://www.yk1kllc.com/collections/howard-university" target="_blank" rel="noopener">Howard</a></li>
              <li><a href="https://www.yk1kllc.com/collections/morehouse" target="_blank" rel="noopener">Morehouse</a></li>
              <li><a href="https://www.yk1kllc.com/collections/pvamu" target="_blank" rel="noopener">PVAMU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/tennessee-state-university" target="_blank" rel="noopener">Tennessee State</a></li>
              <li><a href="https://www.yk1kllc.com/collections/texas-southern" target="_blank" rel="noopener">Texas Southern</a></li>
              <li><a href="https://www.yk1kllc.com/collections/tuskegee-university" target="_blank" rel="noopener">Tuskegee</a></li>
              <li><a href="https://www.yk1kllc.com/collections/ncat" target="_blank" rel="noopener">NCAT</a></li>
              <li><a href="https://www.yk1kllc.com/collections/clark-atlanta" target="_blank" rel="noopener">Clark Atlanta</a></li>
            </ul>
          </div>
          <div class="school-block" id="colleges">
            <h3>Colleges</h3>
            <ul>
              <li><a href="https://www.yk1kllc.com/collections/baylor-university" target="_blank" rel="noopener">Baylor University</a></li>
              <li><a href="https://www.yk1kllc.com/collections/lsu" target="_blank" rel="noopener">LSU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/smu-1" target="_blank" rel="noopener">SMU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/texas-christian-university" target="_blank" rel="noopener">TCU</a></li>
              <li><a href="https://www.yk1kllc.com/collections/university-of-houston" target="_blank" rel="noopener">University of Houston</a></li>
              <li><a href="https://www.yk1kllc.com/collections/university-of-north-texas" target="_blank" rel="noopener">UNT</a></li>
              <li><a href="https://www.yk1kllc.com/collections/university-of-arizona" target="_blank" rel="noopener">University of Arizona</a></li>
            </ul>
          </div>
          <div class="school-block" id="dallas-hs">
            <h3>Dallas High Schools</h3>
            <ul>
              <li><a href="https://www.yk1kllc.com/collections/carter-cowboys" target="_blank" rel="noopener">Carter Cowboys</a></li>
              <li><a href="https://www.yk1kllc.com/collections/south-oak-cliff" target="_blank" rel="noopener">South Oak Cliff</a></li>
              <li><a href="https://www.yk1kllc.com/collections/lincoln-tigers" target="_blank" rel="noopener">Lincoln Tigers</a></li>
              <li><a href="https://www.yk1kllc.com/collections/skyline-raiders" target="_blank" rel="noopener">Skyline Raiders</a></li>
              <li><a href="https://www.yk1kllc.com/collections/desoto-eagles" target="_blank" rel="noopener">DeSoto Eagles</a></li>
              <li><a href="https://www.yk1kllc.com/collections/duncanville-panthers" target="_blank" rel="noopener">Duncanville Panthers</a></li>
              <li><a href="https://www.yk1kllc.com/collections/kimball-knights" target="_blank" rel="noopener">Kimball Knights</a></li>
              <li><a href="https://www.yk1kllc.com/collections/cedar-hill-longhorns-1" target="_blank" rel="noopener">Cedar Hill</a></li>
            </ul>
          </div>
        </div>
        <div class="btn-row" style="margin-top:2rem">
          <a class="btn btn-gold" href="school-orders.html">School / Org Orders</a>
          <a class="btn btn-ghost" href="custom.html">Need 25–2,500 pieces?</a>
        </div>
      </div>
    </section>
""",
}

PAGES["collections/grambling.html"] = {
    "title": "Grambling State — YK1K School House",
    "description": "Grambling State University collection: shorts, shirts, hats, jackets, and homecoming bundles.",
    "active": "school",
    "depth": 1,
    "body": page_hero(
        "School House · Grambling",
        "Grambling State University",
        "A School House microsite — shop the collection, build a homecoming pack, or request a group order.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="btn-row" style="margin-bottom:2rem">
          <a class="btn btn-gold" href="https://www.yk1kllc.com/collections/grambling-state-university" target="_blank" rel="noopener">Shop live collection</a>
          <a class="btn btn-ghost" href="../pages/school-orders.html">Alumni / group order</a>
        </div>
        <div class="product-grid reveal">
          <a class="product" href="https://www.yk1kllc.com/collections/grambling-state-university" target="_blank" rel="noopener">
            <div class="product-media"><img src="../assets/product-13.jpg" alt="Grambling black basketball shorts" /></div>
            <div class="product-meta"><h3>Basketball Shorts — Black</h3><p>$50</p></div>
          </a>
          <a class="product" href="https://www.yk1kllc.com/collections/grambling-state-university" target="_blank" rel="noopener">
            <div class="product-media"><img src="../assets/product-18.jpg" alt="Grambling red basketball shorts" /></div>
            <div class="product-meta"><h3>Basketball Shorts — Red</h3><p>$50</p></div>
          </a>
          <a class="product" href="../pages/school-house.html">
            <div class="product-media"><img src="../assets/product-1.jpg" alt="Homecoming hat placeholder" /></div>
            <div class="product-meta"><h3>Homecoming Full Fit</h3><p>Shirt + shorts + hat</p></div>
          </a>
          <a class="product" href="../pages/school-orders.html">
            <div class="product-media"><img src="../assets/product-8.jpg" alt="Legacy pack jacket" /></div>
            <div class="product-meta"><h3>Legacy Pack</h3><p>Jacket + hat + shirt</p></div>
          </a>
        </div>
        <div class="bundle-grid" style="margin-top:2.5rem">
          <div class="bundle"><h3>Starter Pack</h3><p>Shirt + shorts</p><div class="price">Bundle &amp; save</div></div>
          <div class="bundle"><h3>Full Fit</h3><p>Shirt + shorts + hat</p><div class="price">Best for homecoming</div></div>
          <div class="bundle"><h3>Custom Group</h3><p>25+ for alumni &amp; orgs</p><div class="price"><a class="link-more" href="../pages/school-orders.html">Get a quote →</a></div></div>
        </div>
      </div>
    </section>
""",
}

PAGES["pages/dallas.html"] = {
    "title": "YK1K Dallas — 214 & South Dallas Culture",
    "description": "YK1K Dallas: 214 shirts, Oak Cliff, South Dallas, neighborhood capsules, and city culture.",
    "active": "dallas",
    "depth": 1,
    "body": page_hero(
        "Engine 2 · YK1K Dallas",
        "You can buy a Dallas shirt anywhere. You can’t buy Dallas history anywhere.",
        "214 · Oak Cliff · South Dallas · neighborhood capsules · music · legends.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="product-grid reveal">
          <a class="product" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-4.jpg" alt="Dallas 214 acid black" /></div><div class="product-meta"><h3>Dallas 214 Acid Black</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-6.jpg" alt="Dallas 214 espresso" /></div><div class="product-meta"><h3>Dallas 214 Espresso</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-9.jpg" alt="Dallas 214 white black" /></div><div class="product-meta"><h3>Dallas 214 White/Black</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-8.jpg" alt="This Is Dallas varsity" /></div><div class="product-meta"><h3>This Is Dallas Varsity</h3><p>From $125</p></div></a>
        </div>
        <div class="btn-row" style="margin-top:2rem">
          <a class="btn btn-gold" href="https://www.yk1kllc.com/collections/dallas-merch" target="_blank" rel="noopener">Shop Dallas Merch</a>
          <a class="btn btn-ghost" href="our-story.html">Why Dallas matters</a>
        </div>
      </div>
    </section>
""",
}

PAGES["pages/originals.html"] = {
    "title": "YK1K Originals — Flagship Streetwear",
    "description": "YK1K Originals: Crown, Supreme seasonal collections, premium fleece, denim, signature jackets.",
    "active": "originals",
    "depth": 1,
    "body": page_hero(
        "Engine 1 · YK1K Originals",
        "Don’t wear a logo. Wear a story.",
        "Highest brand equity — Crown, seasonal collections, premium fleece, denim, signature jackets.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="product-grid reveal">
          <a class="product" href="https://www.yk1kllc.com/collections/spring-26" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-2.jpg" alt="YK1K / SMU trucker" /></div><div class="product-meta"><h3>Crown &amp; Capsule Hats</h3><p>From $30</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-7.jpg" alt="Camo jacket" /></div><div class="product-meta"><h3>Signature Jackets</h3><p>From $125</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/collections/shirts" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-10.jpg" alt="YK1K tee" /></div><div class="product-meta"><h3>Supreme / King of Hearts</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/collections/winter-26" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-5.jpg" alt="Seasonal drop" /></div><div class="product-meta"><h3>Seasonal Drops</h3><p>Limited</p></div></a>
        </div>
        <p class="section-sub" style="margin-top:1.5rem">Drops move on a calendar: evergreen staples, monthly limited drops, quarterly signature collections, and archive returns.</p>
      </div>
    </section>
""",
}

PAGES["pages/shop-new.html"] = {
    "title": "New Drop — YK1K",
    "description": "Shop the latest YK1K drop: Dallas, School House, and Originals.",
    "active": "new",
    "depth": 1,
    "body": page_hero("New Drop", "What’s out now.", "Best sellers and latest pieces — then jump into the live store for checkout.")
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="product-grid reveal">
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-12.jpg" alt="Dallas 214 blue" /></div><div class="product-meta"><h3>Dallas 214 Blue</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-14.jpg" alt="LSU purple shorts" /></div><div class="product-meta"><h3>LSU Purple Shorts</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-15.jpg" alt="Southern shorts" /></div><div class="product-meta"><h3>Southern University Shorts</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-3.jpg" alt="Camo trucker" /></div><div class="product-meta"><h3>Camo Trucker</h3><p>$30</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-16.jpg" alt="LSU gold shorts" /></div><div class="product-meta"><h3>LSU Gold Shorts</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-17.jpg" alt="LSU black shorts" /></div><div class="product-meta"><h3>LSU Black Shorts</h3><p>$50</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-1.jpg" alt="This Is Dallas hat" /></div><div class="product-meta"><h3>This Is Dallas Hat</h3><p>$30</p></div></a>
          <a class="product" href="https://www.yk1kllc.com/" target="_blank" rel="noopener"><div class="product-media"><img src="../assets/product-8.jpg" alt="Dallas varsity" /></div><div class="product-meta"><h3>Dallas Varsity</h3><p>From $125</p></div></a>
        </div>
        <div class="btn-row" style="margin-top:2rem">
          <a class="btn btn-gold" href="https://www.yk1kllc.com/" target="_blank" rel="noopener">Checkout on yk1kllc.com</a>
          <a class="btn btn-ghost" href="vip.html">Get early access next time</a>
        </div>
      </div>
    </section>
""",
}

PAGES["pages/custom.html"] = {
    "title": "YK1K Custom — 25 to 2,500 Pieces",
    "description": "YK1K Custom: schools, alumni, teams, reunions, churches, artists, corporations — get a quote.",
    "active": "custom",
    "depth": 1,
    "body": page_hero(
        "YK1K Custom",
        "Need 25–2,500 pieces? Get a quote.",
        "Schools · alumni · teams · reunions · churches · festivals · musicians · restaurants · barbershops · nonprofits · corporations.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <form class="form-grid two" data-inquiry-form>
          <label>Organization<input name="org" required /></label>
          <label>Contact email<input type="email" name="email" required /></label>
          <label>Quantity
            <select name="qty"><option>25–49</option><option>50–99</option><option>100–249</option><option>250–999</option><option>1,000–2,500+</option></select>
          </label>
          <label>Deadline<input type="date" name="deadline" /></label>
          <label>Product type
            <select name="product"><option>Tees</option><option>Shorts</option><option>Hats</option><option>Jackets</option><option>Mixed / full fit</option></select>
          </label>
          <label>Budget range<input name="budget" placeholder="$ / piece or total" /></label>
          <label style="grid-column:1/-1">Artwork / notes<textarea name="notes" placeholder="School, event, sizes, artwork links…"></textarea></label>
          <div style="grid-column:1/-1">
            <button class="btn btn-gold" type="submit">Request quote</button>
            <p class="form-note" data-form-status>Or email youngkingsonline@gmail.com / call 214.417.6839.</p>
          </div>
        </form>
      </div>
    </section>
""",
}

PAGES["pages/wholesale.html"] = {
    "title": "Wholesale — YK1K",
    "description": "YK1K wholesale for boutiques, campus stores, gift retailers, and cultural shops.",
    "active": "",
    "depth": 1,
    "body": page_hero(
        "Wholesale",
        "Stock YK1K.",
        "Boutiques · campus bookstores (where licensing permits) · Dallas gift · museum/cultural · Black-owned · sports retail.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container prose">
        <p>Ask for the wholesale line sheet: MOQ, MSRP, wholesale pricing, lookbook, and ordering process.</p>
        <form class="form-grid" data-inquiry-form>
          <label>Business name<input name="biz" required /></label>
          <label>Buyer email<input type="email" name="email" required /></label>
          <label>Retail type<input name="type" placeholder="Boutique, bookstore, museum…" /></label>
          <label>City / state<input name="city" /></label>
          <label>Message<textarea name="message" placeholder="Lines of interest, volume, timeline"></textarea></label>
          <button class="btn btn-gold" type="submit">Request wholesale info</button>
          <p class="form-note" data-form-status>We’ll follow up with catalog access.</p>
        </form>
      </div>
    </section>
""",
}

PAGES["pages/school-orders.html"] = {
    "title": "School & Organization Orders — YK1K",
    "description": "Group and organization apparel orders for schools, alumni, and teams.",
    "active": "school",
    "depth": 1,
    "body": page_hero(
        "School / Organization Orders",
        "Homecoming, reunions, teams, Greek life.",
        "Personal QR codes, campus kits, and volume pricing through YK1K Custom + School House.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container">
        <form class="form-grid two" data-inquiry-form>
          <label>School / org<input name="school" required /></label>
          <label>Role<input name="role" placeholder="Alumni chair, coach, advisor…" /></label>
          <label>Email<input type="email" name="email" required /></label>
          <label>Event date<input type="date" name="date" /></label>
          <label style="grid-column:1/-1">What you need<textarea name="needs" placeholder="Quantities, products, colors, delivery location"></textarea></label>
          <div style="grid-column:1/-1">
            <button class="btn btn-gold" type="submit">Submit school order inquiry</button>
            <p class="form-note" data-form-status></p>
          </div>
        </form>
      </div>
    </section>
""",
}

PAGES["pages/collaborations.html"] = {
    "title": "Collaborations — YK1K",
    "description": "Collaborate with YK1K: artists, campuses, brands, and cultural partners.",
    "active": "",
    "depth": 1,
    "body": page_hero(
        "Collaborations",
        "Build with the Crown.",
        "Artists · campuses · cultural institutions · limited capsules · YK1K 100 creators.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container prose">
        <p>We prioritize partners who share Dallas authenticity, cultural storytelling, and community impact — not random logo swaps.</p>
        <form class="form-grid" data-inquiry-form>
          <label>Name / brand<input name="name" required /></label>
          <label>Email<input type="email" name="email" required /></label>
          <label>Instagram / site<input name="social" /></label>
          <label>Pitch<textarea name="pitch" required placeholder="Audience, idea, timeline, deliverables"></textarea></label>
          <button class="btn btn-gold" type="submit">Submit collab pitch</button>
          <p class="form-note" data-form-status></p>
        </form>
      </div>
    </section>
""",
}

PAGES["pages/press.html"] = {
    "title": "Press — YK1K",
    "description": "YK1K press coverage from D Magazine, Voyage Dallas, Dallas ISD, and more.",
    "active": "",
    "depth": 1,
    "body": page_hero("Press", "In the culture.", "Selected coverage. For press kits and interviews: youngkingsonline@gmail.com")
    + """
    <section class="section" style="padding-top:0">
      <div class="container press-list">
        <a class="press-item" href="https://www.dmagazine.com/publications/d-magazine/2024/july/dallas-streetwear-brand-yk1k-is-about-more-than-passing-fads/" target="_blank" rel="noopener">
          <span>D Magazine · July 2024</span>
          <strong>Dallas Streetwear Brand YK1K Is About More Than Passing Fads</strong>
          <p>Family Flex — Bambata Tyehimba on legacy, Pan-African Connection roots, and pieces worn across Dallas culture.</p>
        </a>
        <a class="press-item" href="https://voyagedallas.com/interview/meet-bambata-hogue-youngkingsclothing-yk1k-oak-cliff/" target="_blank" rel="noopener">
          <span>Voyage Dallas</span>
          <strong>Meet Bambata Hogue of Young Kings Clothing YK1K</strong>
          <p>Oak Cliff origin story — fashion, culture, and manufacturing for brands and organizations.</p>
        </a>
        <a class="press-item" href="https://thehub.dallasisd.org/2026/02/16/from-carter-cowboy-to-clothing-entrepreneur-alum-credits-his-roots/" target="_blank" rel="noopener">
          <span>Dallas ISD The Hub · 2026</span>
          <strong>From Carter Cowboy to clothing entrepreneur</strong>
          <p>Carter High roots, TSU football, classroom teaching, and licensed school apparel growth.</p>
        </a>
      </div>
    </section>
""",
}

PAGES["pages/vip.html"] = {
    "title": "Join The Kings List — YK1K VIP",
    "description": "Get $10 off and early access to limited YK1K drops.",
    "active": "vip",
    "depth": 1,
    "body": page_hero(
        "The Kings List",
        "Get $10 off + early access to limited drops.",
        "Members see drops before everybody else. Tag your school/city for relevant releases.",
    )
    + """
    <section class="section" style="padding-top:0">
      <div class="container" style="max-width:32rem">
        <form class="vip-form" data-vip-form>
          <input type="email" name="email" required placeholder="Email address" />
          <input type="tel" name="sms" placeholder="Mobile for SMS (optional)" />
          <select name="school">
            <option value="">School / city</option>
            <option>Dallas</option>
            <option>Houston</option>
            <option>Grambling</option>
            <option>FAMU</option>
            <option>Jackson State</option>
            <option>Baylor</option>
            <option>LSU</option>
            <option>SMU</option>
            <option>Carter HS</option>
            <option>Other</option>
          </select>
          <button class="btn btn-gold" type="submit">Join VIP</button>
          <p class="form-note" data-form-status>No spam — drops, homecoming countdowns, and VIP cash.</p>
        </form>
      </div>
    </section>
""",
}


def main() -> None:
    for rel, meta in PAGES.items():
        out = ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        html = chrome(
            title=meta["title"],
            description=meta["description"],
            active=meta["active"],
            depth=meta["depth"],
            body=meta["body"],
        )
        out.write_text(html, encoding="utf-8")
        print("wrote", rel)


if __name__ == "__main__":
    main()
