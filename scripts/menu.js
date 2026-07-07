(() => {
  const menuButton = document.querySelector(".header__logo-button");
  const navigation = document.querySelector(".header__nav");

  if (!menuButton || !navigation) return;

  const closeMenu = () => {
    navigation.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  };

  menuButton.addEventListener("click", event => {
    event.stopPropagation();
    const isOpen = navigation.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  navigation.addEventListener("click", event => {
    if (event.target.matches("a")) closeMenu();
  });

  document.addEventListener("click", event => {
    if (event.target.closest(".header__nav")) return;
    closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });
})();
