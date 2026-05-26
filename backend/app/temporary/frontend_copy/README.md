# teste-mapa-next
This is a Next.js application built with React and TypeScript, leveraging the App Router for page routing and layout management. It utilizes Material UI for a modern and responsive user interface, and `next-intl` for internationalization, supporting multiple languages like English and Portuguese.

# Main technologies of this repository
*   **Next.js**: A React framework for building full-stack web applications.
*   **React**: A JavaScript library for building user interfaces.
*   **TypeScript**: A strongly typed superset of JavaScript.
*   **Material UI (MUI)**: A comprehensive UI library for React.
*   **next-intl**: A library for internationalization (i18n) in Next.js applications.
*   **ESLint**: A linter for identifying and reporting on patterns in JavaScript code.

# Main File Structure 
*   `.eslintrc.json`: Configuration file for ESLint.
*   `next.config.mjs`: Configuration file for Next.js.
*   `package.json`: Project metadata and dependency list.
*   `package-lock.json`: Records the exact versions of dependencies.
*   `tsconfig.json`: TypeScript compiler configuration.
*   `src/`: Contains the main application source code.
    *   `app/`: Holds Next.js App Router pages, layouts, global styles, theme configuration, and assets like `favicon.ico` and custom fonts (`GeistMonoVF.woff`, `GeistVF.woff`).
        *   `Styledroot.tsx`: Likely a root component for styled-components or Emotion styling.
        *   `globals.css`: Global CSS styles.
        *   `layout.tsx`: Root layout for the application.
        *   `page.tsx`: The main index page.
        *   `page.module.css`: Module-scoped CSS for the main page.
        *   `about/`, `article/`, `contact/`, `profile/`, `result/`: Directories for specific application pages.
        *   `theme.ts`: Theme configuration for Material UI.
    *   `components/`: Reusable UI components.
        *   `common/`: General-purpose components like `Dashboard.tsx` and `News.tsx`.
        *   `layout/`: Components related to the application layout, such as `Footer.tsx` and `MainMenu.tsx`.
    *   `locales/`: Contains internationalization message files, e.g., `en.json` for English and `pt.json` for Portuguese.

# How to run the project
To get started with this project, follow these steps:

1.  **Install Dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

2.  **Run in Development Mode**:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the development server, usually accessible at `http://localhost:3000`.

3.  **Build for Production**:
    ```bash
    npm run build
    # or
    yarn build
    ```
    This command compiles the application for production deployment.

4.  **Start Production Server**:
    ```bash
    npm run start
    # or
    yarn start
    ```
    After building, this command serves the production-ready application.

# Language or internalization
This project supports internationalization (i18n) using the `next-intl` library. Language files are located in the `src/locales` directory, with support for English (`en.json`) and Portuguese (`pt.json`). The application is configured to handle multiple languages, allowing users to switch between them.