# Chibi-Pix: Pixel Art Creator

Chibi-Pix is a user-friendly, web-based application for creating pixel art and simple animations. It provides an intuitive interface, making it accessible for both beginners and experienced artists to bring their pixelated creations to life.

## Motivation

This project was developed as a hands-on initiative to refresh and apply front-end development skills after a long break. The goal was to build a complete, functional web application using a modern tech stack, reinforcing core concepts in state management, UI development, and application architecture.

## Features

*   **Drawing Tools:** A simple and effective set of tools for pixel-perfect drawing.
*   **Layer Management:** Support for multiple layers to help organize your artwork.
*   **Animation:** A feature to create simple, frame-by-frame animations.
*   **Project Import/Export:**
    *   Save your work, including all layers and animation frames, to a custom project file.
    *   Import these files back into Chibi-Pix to resume your work at any time.
*   **Export to Common Formats:**
    *   Export your static creations as `PNG` or `JPG` files.
    *   Export your animations as animated `GIFs` or as a `Spritesheet`.
*   **Web-Based:** No installation required. You can access it from any modern web browser.

## Live Application

You can try out the live application here: **[https://chibi-pix.vercel.app/](https://chibi-pix.vercel.app/)**

## Running Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

You will need [Node.js](https://nodejs.org/) (version 18.x or later) and [**pnpm**](https://pnpm.io/installation) installed on your machine.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Gerpea/ChibiPix.git
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd ChibiPix
    ```
3.  **Install dependencies:**
    ```sh
    pnpm install
    ```
4.  **Build the Web Workers:**
    *This step is required for the export functionality to work correctly.*
    ```sh
    pnpm build:workers
    ```
5.  **Run the development server:**
    ```sh
    pnpm dev
    ```

The application should now be running on [http://localhost:3000](http://localhost:3000).

## Technologies Used

This project is built with a modern and robust technology stack:

*   **Core Framework:**
    *   **Next.js:** A React framework for building user interfaces.
    *   **React:** A JavaScript library for building user interfaces.
    *   **TypeScript:** For static typing and improved developer experience.

*   **State Management:**
    *   **Zustand:** A small, fast, and scalable state-management solution.

*   **Styling & UI:**
    *   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
    *   **shadcn/ui:** A collection of re-usable components for building modern web applications.

*   **Testing:**
    *   **Playwright:** An end-to-end testing framework.