@media screen and (min-width: 768px) {
  .styleWithMedia {
    padding: 10px;
    margin: var(--space-2x) var(--space-4x);
  }
}

@media (prefers-reduced-motion) {
  .styleWithMedia {
    transition-property: color;
  }
}
