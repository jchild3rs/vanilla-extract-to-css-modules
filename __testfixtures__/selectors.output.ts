.styleWithSelectors {
  color: red;
  font-size: 12px;
}

.styleWithSelectors:hover {
  color: red;
  margin: var(--space-2x) var(--space-4x);
}

nav li > .styleWithSelectors {
  text-decoration: underline;
}

.styleWithSelectors:active {
  color: blue;
}
