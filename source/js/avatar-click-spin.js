document.addEventListener('DOMContentLoaded', () => {
  const avatarWrappers = document.querySelectorAll('.avatar-img')

  avatarWrappers.forEach((avatar) => {
    avatar.addEventListener('click', () => {
      avatar.classList.remove('avatar-spin-on-click')
      void avatar.offsetWidth
      avatar.classList.add('avatar-spin-on-click')
    })

    avatar.addEventListener('animationend', () => {
      avatar.classList.remove('avatar-spin-on-click')
    })
  })
})
