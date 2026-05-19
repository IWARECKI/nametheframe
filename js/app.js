// Django equivalent: urls.py + wsgi.py — application entry point
// In Django, urls.py wires up all views; wsgi.py boots the server.
// Here, app.js is the last script loaded and serves as the bootstrap:
// by the time it runs, all data, services, game logic, and UI modules
// are already defined (scripts are loaded in dependency order in index.html).
//
// Currently there is no additional wiring needed — each module
// self-initialises (intro.js runs the animation immediately;
// setup.js attaches event listeners at parse time).
//
// Future: if ES modules are adopted, this file becomes the single
// import entry point:
//   import { FILMS }        from './data/films.js';
//   import { startGame }    from './ui/setup.js';
//   ...etc.
