# Diagrami Namestitve

Ta dokument prikazuje arhitekturo namestitve sistema Confera in tok CI/CD procesa. Diagrami so zapisani v Mermaid sintaksi, zato se lahko prikažejo neposredno v GitHubu in se kasneje izvozijo kot PDF diagrami.

## Arhitektura Namestitve Sistema

```mermaid
flowchart LR
    User["Uporabnik<br/>Spletni brskalnik"]

    subgraph FrontendHost["Vercel"]
        Frontend["Next.js spletni vmesnik"]
    end

    subgraph BackendHost["Render"]
        Backend["NestJS zaledni API"]
        Health["GET /health"]
    end

    subgraph FirebaseCloud["Firebase"]
        Auth["Firebase Authentication"]
        Firestore["Firestore podatkovna baza"]
    end

    Email["E-poštna storitev<br/>SMTP ali SendGrid"]

    User -->|"HTTPS"| Frontend
    Frontend -->|"REST API prek HTTPS"| Backend
    Backend --> Health
    Backend -->|"Preverjanje identitete"| Auth
    Backend -->|"Branje in pisanje podatkov"| Firestore
    Backend -.->|"Obvestila"| Email
```

## CI/CD Tok Namestitve

```mermaid
flowchart TD
    Dev["Razvijalec"] --> Local["Lokalni razvoj"]
    Local --> Git["Git commit"]
    Git --> GitHub["GitHub repozitorij"]

    GitHub --> Actions["GitHub Actions"]

    Actions --> FrontendCI["Frontend CI/CD"]
    Actions --> BackendCI["Backend CI/CD"]

    FrontendCI --> FInstall["Namestitev odvisnosti"]
    FInstall --> FLint["Preverjanje kode"]
    FLint --> FTests["Zagon testov, če obstajajo"]
    FTests --> FBuild["Gradnja Next.js aplikacije"]
    FBuild --> VercelDeploy["Namestitev na Vercel"]

    BackendCI --> BInstall["Namestitev odvisnosti"]
    BInstall --> BLint["Preverjanje kode"]
    BLint --> BTests["Zagon Jest testov s pokritostjo"]
    BTests --> BBuild["Gradnja NestJS aplikacije"]
    BBuild --> Sonar["Analiza v SonarQube Cloud"]
    Sonar --> RenderHook["Sprožitev Render deploy hook"]
    RenderHook --> RenderDeploy["Namestitev na Render"]

    VercelDeploy --> FrontendLive["Delujoč spletni vmesnik"]
    RenderDeploy --> BackendLive["Delujoč zaledni sistem"]
```

## Okolja In Zunanje Storitve

```mermaid
flowchart TB
    subgraph Repo["GitHub"]
        Code["Izvorna koda"]
        Workflows["GitHub Actions workflow datoteke"]
        Secrets["GitHub Actions skrivnosti"]
    end

    subgraph SecretsList["Uporabljene skrivnosti"]
        RenderSecret["RENDER_DEPLOY_HOOK_URL"]
        SonarToken["SONAR_TOKEN"]
        SonarProject["SONAR_PROJECT_KEY"]
        SonarOrg["SONAR_ORGANIZATION"]
        VercelToken["VERCEL_TOKEN"]
        VercelOrg["VERCEL_ORG_ID"]
        VercelProject["VERCEL_PROJECT_ID"]
    end

    subgraph RuntimeSecrets["Render okoljske spremenljivke"]
        FirebaseProject["FIREBASE_PROJECT_ID"]
        FirebaseEmail["FIREBASE_CLIENT_EMAIL"]
        FirebaseKey["FIREBASE_PRIVATE_KEY"]
    end

    Secrets --> SecretsList
    Code --> Workflows
    Workflows -->|"CI/CD uporablja"| SecretsList
    RuntimeSecrets -->|"Zaledni sistem uporablja ob zagonu"| Backend["NestJS zaledni API na Renderju"]
```
