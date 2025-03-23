
import { APPLICATION_CONTROLLER } from "../components/controller/application.js";


// import { getGroups, countInteractions, getCountryCode, getXPS } from "./utils.js";

const graphqlEndpoint = "https://zone01normandie.org/api/graphql-engine/v1/graphql";



const customBtoa = (input) => {
  const encoder = new TextEncoder()
  const unint8Array = encoder.encode(input)
  let bin = ''
  unint8Array.forEach(byte => {
      bin += String.fromCharCode(byte)
  });
  return btoa(bin)
} 

const app = document.querySelector('#app')
export const login = async (e) => {
    e.preventDefault()
    const username = document.getElementById("login").value;
    const password = document.getElementById("password").value;
    const token = customBtoa(`${username}:${password}`);

  try {
    const response = await fetch("https://zone01normandie.org/api/auth/signin", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    const auth = await response.json();
    localStorage.setItem("auth", auth);
    document.body.innerHTML = `<c-profile-page></c-profile-page>`
    return

  } catch (error) {
    document.getElementById("error-message").innerText = error.message;
  }
}

export function logout() {
  localStorage.removeItem("auth");
  app.innerHTML = ``
  app.innerHTML = `<c-login-page></c-login-page>`
}



export const isAuth = async () => {
	const auth = localStorage.getItem('auth')
	const query = {
        query: `{
            user {
            	id
                login
            }
        }
    `
    }
    try {
        const response = await fetch("https://zone01normandie.org/api/graphql-engine/v1/graphql", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${auth}`,
            },
            body: JSON.stringify(query)
        })
        
        const info =  await response.json()
        if (!info.data) {
            return false
        }
        return true

    } catch (error) {
        console.error()
        return null
    }
}