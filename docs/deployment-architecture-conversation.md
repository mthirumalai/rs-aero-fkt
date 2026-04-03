# Deployment and Architecture Discussion

**Date**: March 19, 2026

## User Question

I need your help with deploying the app for general availability. Here is some context. This app is going to hang off a relatively simple website www.rsaerona.org and written in Wordpress and on a different server. My thought was when the user clicked on the FKT page, they would be dropped into this app. So the users would not share identity and user profile in the two apps for this light integration scenario.

Deeper integrations are also possible where this app feels more like a native part of the wordpress app. How could we do that without rewriting the app in Wordress or rewriting rsaerona.org in this app?

## Response 1: Integration Options Overview

Great question! There are several approaches for integrating your Next.js FKT app with your WordPress site. Let me break down the options from light to deep integration:

### **Light Integration (Separate Apps)**

#### **Option 1: Subdomain Deployment**
```
Main site: www.rsaerona.org (WordPress)
FKT app:  fkt.rsaerona.org (Next.js on Railway/Vercel)
```
- **Pros**: Clean separation, easy to maintain, independent scaling
- **Cons**: Users notice they're on different domains
- **Setup**: Point `fkt.rsaerona.org` DNS to Railway/Vercel

#### **Option 2: Path-Based Routing**
```
Main site: www.rsaerona.org (WordPress)
FKT app:  www.rsaerona.org/fkt (Next.js behind reverse proxy)
```
- **Pros**: Seamless URL experience
- **Cons**: Requires server configuration
- **Setup**: Nginx/Cloudflare reverse proxy routes `/fkt/*` to Next.js app

### **Medium Integration (Shared Experience)**

#### **Option 3: Iframe Embedding**
- Embed Next.js app in WordPress pages via iframe
- **Pros**: Native feel, shared navigation
- **Cons**: Iframe limitations (mobile, SEO, security)

#### **Option 4: Shared Styling + SSO**
- Style Next.js app to match WordPress theme
- Implement Single Sign-On between apps
- **Implementation**:
  ```javascript
  // WordPress generates JWT token
  // Next.js validates and creates session
  // Shared user experience across both apps
  ```

### **Deep Integration (Native Feel)**

#### **Option 5: WordPress Headless CMS**
```
WordPress (Headless) ← API → Next.js (Frontend for both)
```
- Migrate WordPress content to headless
- Next.js becomes frontend for everything
- **Pros**: Unified codebase, modern performance
- **Cons**: Major migration effort

#### **Option 6: WordPress Plugin Architecture**
```javascript
// WordPress plugin that:
// 1. Proxies requests to Next.js API
// 2. Renders Next.js components in WordPress
// 3. Shares authentication/users
```

#### **Option 7: Micro-Frontend Architecture**
```javascript
// WordPress serves main shell
// Next.js components loaded as micro-frontends
// Shared state management (Redux/Zustand)
```

### **Recommended Approach**

For your use case, I'd recommend **Option 2 (Path-Based) + Shared Styling**:

#### **Phase 1: Path-Based Deployment**
1. Deploy Next.js to Railway/Vercel
2. Configure reverse proxy:
   ```nginx
   # Nginx config
   location /fkt {
       proxy_pass https://your-railway-app.railway.app;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $remote_addr;
   }
   ```

#### **Phase 2: Visual Integration**
1. Extract WordPress theme colors/fonts
2. Update Next.js `globals.css`:
   ```css
   :root {
     /* Match WordPress theme */
     --wp-primary: #your-color;
     --wp-font: 'Your-Font';
   }
   ```

#### **Phase 3: Navigation Integration**
1. Add WordPress header/footer to Next.js:
   ```javascript
   // components/WordPressLayout.tsx
   export function WordPressLayout({ children }) {
     return (
       <div>
         <WordPressHeader />
         {children}
         <WordPressFooter />
       </div>
     );
   }
   ```

### **Implementation Questions**

To help choose the best approach:

1. **How critical is SEO** for the FKT pages?
2. **Do you need shared user accounts** between WordPress and FKT?
3. **What's your WordPress hosting setup** (shared, VPS, managed)?
4. **How much control do you have** over server configuration?
5. **Timeline and budget** for integration work?

Would you like me to detail the implementation for any specific approach? The path-based + styling approach gives you 80% of native feel with minimal complexity.

## Follow-up Context

User likes option 2 and mentions they might make the Node.js FKT app standalone supporting other classes of boats beyond RS Aero, with two potential approaches:
- Context-aware: Traffic from rsaerona.org shows pure RS Aero site, traffic from different domain (fkt.nav) shows all classes
- Single site with all classes displayed

## Response 2: Context-Aware Multi-Class Architecture

Excellent choice on Option 2! And that's a brilliant strategic vision for expanding to other boat classes. The context-aware approach (first option) is particularly smart - you could essentially white-label the app for different sailing communities.

### **Context-Aware Multi-Class Architecture**

Here's how to implement the adaptive branding approach:

#### **1. Host-Based Configuration**
```typescript
// lib/site-config.ts
export type SiteConfig = {
  name: string;
  domain: string;
  branding: {
    primaryColor: string;
    logo: string;
    favicon: string;
  };
  boatClasses: string[];
  features: {
    showMultiClass: boolean;
    customNavigation?: any;
  };
};

export const SITE_CONFIGS: Record<string, SiteConfig> = {
  'rsaerona.org': {
    name: 'RS Aero FKT',
    domain: 'rsaerona.org',
    branding: {
      primaryColor: '#ec008c', // RS Aero pink
      logo: '/logos/rs-aero.png',
      favicon: '/favicons/rs-aero.ico',
    },
    boatClasses: ['AERO_5', 'AERO_6', 'AERO_7', 'AERO_9'],
    features: {
      showMultiClass: false,
    },
  },
  'fkt.nav': {
    name: 'Sailing FKT',
    domain: 'fkt.nav',
    branding: {
      primaryColor: '#2563eb', // Generic blue
      logo: '/logos/generic-sailing.png',
      favicon: '/favicons/generic.ico',
    },
    boatClasses: ['AERO_5', 'AERO_6', 'AERO_7', 'AERO_9', 'LASER_STANDARD', 'LASER_RADIAL', /* etc */],
    features: {
      showMultiClass: true,
    },
  },
};

export function getSiteConfig(host: string): SiteConfig {
  // Handle both www and non-www, and local dev
  const cleanHost = host.replace('www.', '').replace(':3000', '');
  return SITE_CONFIGS[cleanHost] || SITE_CONFIGS['fkt.nav']; // fallback to generic
}
```

#### **2. Dynamic Theming System**
```typescript
// components/ThemeProvider.tsx
'use client';
export function ThemeProvider({ config, children }: { config: SiteConfig, children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically update CSS custom properties
    document.documentElement.style.setProperty('--primary', config.branding.primaryColor);
    document.title = config.name;

    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) favicon.href = config.branding.favicon;
  }, [config]);

  return <div className="themed-app">{children}</div>;
}
```

#### **3. Root Layout with Host Detection**
```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Get host from headers
  const host = headers().get('host') || 'localhost:3000';
  const siteConfig = getSiteConfig(host);

  return (
    <html lang="en">
      <body>
        <ThemeProvider config={siteConfig}>
          <Nav config={siteConfig} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### **4. Filtered Data Queries**
```typescript
// lib/queries.ts
export async function getRoutesForSite(host: string) {
  const config = getSiteConfig(host);

  return prisma.route.findMany({
    where: {
      status: 'APPROVED',
      // Filter by boat classes for this site
      attempts: {
        some: {
          boatClass: { in: config.boatClasses }
        }
      }
    },
    include: {
      attempts: {
        where: {
          boatClass: { in: config.boatClasses }
        }
      }
    }
  });
}
```

#### **5. Conditional Navigation**
```typescript
// components/Nav.tsx
export function Nav({ config }: { config: SiteConfig }) {
  return (
    <nav>
      <Link href="/">
        <Image src={config.branding.logo} alt={config.name} />
      </Link>

      <div className="nav-links">
        <Link href="/fkts">FKTs</Link>
        <Link href="/routes">Routes</Link>

        {config.features.showMultiClass && (
          <Link href="/boat-classes">Boat Classes</Link>
        )}

        {/* RS Aero specific links only show for rsaerona.org */}
        {config.domain === 'rsaerona.org' && (
          <Link href="/rs-aero-community">Community</Link>
        )}
      </div>
    </nav>
  );
}
```

### **Database Schema Evolution**
You'd need to expand the schema to support multiple boat types:

```prisma
// Add to schema.prisma
enum BoatClass {
  // RS Aero
  AERO_5
  AERO_6
  AERO_7
  AERO_9

  // Laser
  LASER_STANDARD
  LASER_RADIAL
  LASER_4_7

  // 420, 470, etc.
  FOUR_TWENTY
  FOUR_SEVENTY

  // Add more as needed
}

model FktAttempt {
  // ... existing fields
  boatClass   BoatClass  // Replace rigSize
  sailNumber  String?    // Some classes use sail numbers
}
```

### **Deployment Strategy**

#### **Path-Based Setup**
```nginx
# Nginx config for rsaerona.org server
location /fkt {
    proxy_pass https://your-fkt-app.railway.app;
    proxy_set_header Host rsaerona.org;  # Important: preserves original host
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

#### **Multi-Domain Setup**
```javascript
// For future expansion
// fkt.nav → points directly to Railway app
// rsaerona.org/fkt → proxied to Railway app with rsaerona.org host header
```

This architecture gives you:
- ✅ **White-label capability** for other sailing organizations
- ✅ **RS Aero-specific experience** when coming from rsaerona.org
- ✅ **Generic sailing FKT platform** for direct traffic
- ✅ **Single codebase** to maintain
- ✅ **Easy expansion** to new boat classes and communities