const PASSWORD_SESSION_KEY = "block-puzzle-tool:password-ok"

export function requirePasswordAccess(): Promise<void> {
  const password = getConfiguredPassword()

  if (!password || window.sessionStorage.getItem(PASSWORD_SESSION_KEY) === "1") {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const gate = createPasswordGate(password, () => {
      window.sessionStorage.setItem(PASSWORD_SESSION_KEY, "1")
      gate.remove()
      resolve()
    })

    document.body.appendChild(gate)
    gate.querySelector<HTMLInputElement>("input")?.focus()
  })
}

function getConfiguredPassword(): string | null {
  const value = import.meta.env.VITE_APP_PASSWORD

  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue ? trimmedValue : null
}

function createPasswordGate(password: string, onUnlock: () => void): HTMLDivElement {
  const gate = document.createElement("div")
  const form = document.createElement("form")
  const title = document.createElement("h1")
  const label = document.createElement("label")
  const input = document.createElement("input")
  const button = document.createElement("button")
  const message = document.createElement("p")

  gate.className = "password-gate"
  form.className = "password-gate__panel"
  title.textContent = "Block Puzzle Tool"
  label.textContent = "Password"
  label.htmlFor = "password-gate-input"
  input.id = "password-gate-input"
  input.type = "password"
  input.autocomplete = "current-password"
  input.required = true
  button.type = "submit"
  button.textContent = "Unlock"
  message.className = "password-gate__message"
  message.setAttribute("role", "alert")

  form.addEventListener("submit", (event) => {
    event.preventDefault()

    if (input.value === password) {
      onUnlock()
      return
    }

    input.value = ""
    message.textContent = "Password is incorrect."
    input.focus()
  })

  form.append(title, label, input, button, message)
  gate.appendChild(form)

  return gate
}
