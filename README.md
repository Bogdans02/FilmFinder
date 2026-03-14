# FilmFinder

FilmFinder is a multi-page movie discovery web application built with **HTML**, **CSS**, and **Vanilla JavaScript**, using data from the **TMDb API**.

The project allows users to browse popular, upcoming, and top-rated movies, search the movie database, filter results, open detailed movie pages, save favorites, and rate films in a personal profile.

## Features

- Home page with:
  - trending hero slider
  - popular movies
  - upcoming releases
  - top-rated movies
- Movie catalog page with:
  - search by title
  - filtering by genre
  - filtering by year
  - sorting
  - pagination
- Movie details page with:
  - poster
  - title
  - release date
  - rating
  - genres
  - overview
  - trailer
  - similar movies section
- Personal profile page with:
  - favorite movies
  - rated movies
  - ability to remove favorites
  - ability to update or remove rating
- About page
- Data persistence with `localStorage`

## Tech Stack

- HTML5
- CSS3
- JavaScript
- TMDb API
- localStorage

## Project Goal

The goal of this project was to build a functional movie platform without frameworks, focusing on:

- working with a real external API
- building a multi-page interface
- dynamic rendering of movie data
- search and filtering logic
- storing user actions locally

## What I practiced in this project

- Fetch API and async JavaScript
- DOM manipulation
- dynamic UI rendering
- pagination logic
- reusable movie card components
- localStorage for favorites and ratings
- responsive layout design

## How to Run

1. Clone or download the project
2. Open `config.js`
3. Insert your TMDb Read Access Token
4. Open the project folder in VS Code
5. Run the project with Live Server

## Notes

- This project uses **TMDb API** as the movie data source
- Favorites and ratings are stored locally in the browser using `localStorage`
- This is a frontend project and does not include backend authentication

## Author

Created by Bohdan Manita
