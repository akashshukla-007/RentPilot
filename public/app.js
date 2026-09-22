let sb = null;

let state = {
  flats: [],
  tenants: [],
  payments: [],
  bills: [],
  stats: {}
};

let appEntered = false;
let loadingApp = false;


/* -----------------------------
   BASIC HELPERS
----------------------------- */

const $ = (id) => document.getElementById(id);


function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}


function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/* -----------------------------
   INITIALIZATION
----------------------------- */

async function init() {

  try {

    const response = await fetch("/api/config", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load application configuration.");
    }

    const config = await response.json();

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("Supabase configuration is missing.");
    }


    sb = window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey
    );


    /*
      IMPORTANT:

      We check the existing session ONCE.

      We DO NOT reload the page when there is
      no session. This prevents the infinite
      refresh loop.
    */

    const {
      data: sessionData,
      error: sessionError
    } = await sb.auth.getSession();


    if (sessionError) {
      console.error("Session error:", sessionError);
    }


    if (sessionData && sessionData.session) {

      await enterApplication(
        sessionData.session
      );

    } else {

      showLogin();

    }


    /*
      Listen for future authentication changes.
    */

    sb.auth.onAuthStateChange(
      (event, session) => {

        console.log(
          "Supabase auth event:",
          event
        );


        if (
          event === "SIGNED_IN" &&
          session
        ) {

          /*
            Do not await directly inside
            the Supabase auth callback.
          */

          setTimeout(() => {

            enterApplication(session);

          }, 0);

        }


        if (event === "SIGNED_OUT") {

          appEntered = false;
          loadingApp = false;

          showLogin();

        }

      }
    );


  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );

    showLogin();

    $("lm").textContent =
      error.message ||
      "Unable to initialize RentPilot.";

  }

}


/* -----------------------------
   LOGIN SCREEN
----------------------------- */

function showLogin() {

  $("login").classList.remove("hidden");

  $("app").classList.add("hidden");

  if ($("lm")) {
    $("lm").textContent = "";
  }

}


/* -----------------------------
   ENTER APPLICATION
----------------------------- */

async function enterApplication(session) {

  if (!session) {
    showLogin();
    return;
  }


  /*
    Prevent duplicate loading.
  */

  if (loadingApp) {
    return;
  }


  if (appEntered) {
    return;
  }


  loadingApp = true;


  try {

    $("login").classList.add("hidden");

    $("app").classList.remove("hidden");

    $("export").href =
      "/api/export/payments";


    await load();


    appEntered = true;


  } catch (error) {

    console.error(
      "Application loading error:",
      error
    );


    /*
      If the session expired,
      return to login.
    */

    if (
      error.message &&
      (
        error.message.includes("401") ||
        error.message.toLowerCase().includes("unauthorized")
      )
    ) {

      await sb.auth.signOut();

      return;

    }


    $("login").classList.remove("hidden");

    $("app").classList.add("hidden");

    $("lm").textContent =
      error.message ||
      "Unable to load RentPilot.";

  } finally {

    loadingApp = false;

  }

}


/* -----------------------------
   API HELPER
----------------------------- */

async function api(url, options = {}) {

  const {
    data,
    error
  } = await sb.auth.getSession();


  if (error) {
    throw new Error(
      "Unable to read login session."
    );
  }


  if (!data.session) {

    throw new Error(
      "Your login session has expired. Please sign in again."
    );

  }


  const headers = {
    ...(options.headers || {}),
    "Authorization":
      "Bearer " + data.session.access_token,
    "Content-Type": "application/json"
  };


  const response = await fetch(
    url,
    {
      ...options,
      headers
    }
  );


  let result;

  try {

    result = await response.json();

  } catch {

    throw new Error(
      "Server returned an invalid response."
    );

  }


  if (!response.ok) {

    throw new Error(
      result.error ||
      `Request failed (${response.status})`
    );

  }


  return result;

}


/* -----------------------------
   LOAD DASHBOARD
----------------------------- */

async function load() {

  const data =
    await api("/api/dashboard");


  state = data || {};


  state.flats =
    Array.isArray(state.flats)
      ? state.flats
      : [];


  state.tenants =
    Array.isArray(state.tenants)
      ? state.tenants
      : [];


  state.payments =
    Array.isArray(state.payments)
      ? state.payments
      : [];


  state.bills =
    Array.isArray(state.bills)
      ? state.bills
      : [];


  state.stats =
    state.stats || {};


  renderDashboard();

  renderFlats();

  renderTenants();

  renderPayments();

  renderBills();

}


/* -----------------------------
   DASHBOARD
----------------------------- */

function renderDashboard() {

  const stats = state.stats;


  $("s1").textContent =
    stats.totalFlats || 0;


  $("s2").textContent =
    stats.occupied || 0;


  $("s3").textContent =
    money(stats.monthlyCollection);


  $("s4").textContent =
    money(stats.pendingDues);


  const cards =
    state.flats.map(flat => {

      const tenant =
        state.tenants.find(
          t => t.flat_id === flat.id
        );


      const bill =
        state.bills.find(
          b => b.flat_id === flat.id
        );


      return `
        <div class="border border-slate-200 rounded-2xl p-4">

          <div class="flex justify-between items-center">

            <b class="text-lg">
              Flat ${esc(flat.flat_number)}
            </b>

            <span class="text-sm px-2 py-1 rounded-lg bg-slate-100">
              ${esc(flat.status || "")}
            </span>

          </div>


          <p class="text-sm text-slate-500 mt-3">
            ${tenant
              ? esc(tenant.name)
              : "No active tenant"}
          </p>


          <div class="flex justify-between mt-4">
            <span>Rent</span>
            <b>${money(flat.monthly_rent)}</b>
          </div>


          <div class="flex justify-between mt-1">
            <span>Due</span>
            <b>${money(bill?.total_due)}</b>
          </div>

        </div>
      `;

    }).join("");


  $("cards").innerHTML =
    cards ||
    `
      <p class="text-slate-500">
        No flats found.
      </p>
    `;

}


/* -----------------------------
   FLATS
----------------------------- */

function renderFlats() {

  $("fl").innerHTML =
    table(
      ["Flat", "Rent", "Rate", "Status"],
      state.flats.map(flat => [
        flat.flat_number,
        money(flat.monthly_rent),
        money(flat.electricity_rate),
        flat.status
      ])
    );

}


/* -----------------------------
   TENANTS
----------------------------- */

function renderTenants() {

  $("tn").innerHTML =
    table(
      ["Name", "Mobile", "Flat"],
      state.tenants.map(tenant => {

        const flat =
          state.flats.find(
            f => f.id === tenant.flat_id
          );


        return [
          tenant.name,
          tenant.mobile,
          flat?.flat_number || "-"
        ];

      })
    );

}


/* -----------------------------
   PAYMENTS
----------------------------- */

function renderPayments() {

  $("py").innerHTML =
    table(
      ["Date", "Amount", "Mode"],
      state.payments.map(payment => [
        payment.payment_date,
        money(payment.amount),
        payment.mode
      ])
    );

}


/* -----------------------------
   BILLS
----------------------------- */

function renderBills() {

  $("bi").innerHTML =
    table(
      ["Month", "Flat", "Due", "Status"],
      state.bills.map(bill => {

        const flat =
          state.flats.find(
            f => f.id === bill.flat_id
          );


        return [
          bill.month,
          flat?.flat_number || "-",
          money(bill.total_due),
          bill.status
        ];

      })
    );

}


/* -----------------------------
   TABLE GENERATOR
----------------------------- */

function table(headers, rows) {

  if (!rows.length) {

    return `
      <p class="text-slate-500 mt-5">
        No records found.
      </p>
    `;

  }


  return `
    <div class="overflow-auto mt-5">

      <table class="min-w-full text-sm">

        <thead>

          <tr class="border-b">

            ${headers.map(header => `
              <th class="p-3 text-left whitespace-nowrap">
                ${esc(header)}
              </th>
            `).join("")}

          </tr>

        </thead>


        <tbody>

          ${rows.map(row => `

            <tr class="border-b hover:bg-slate-50">

              ${row.map(value => `
                <td class="p-3 whitespace-nowrap">
                  ${esc(value)}
                </td>
              `).join("")}

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;

}


/* -----------------------------
   SECTION NAVIGATION
----------------------------- */

function show(section) {

  const sections = [
    "dashboard",
    "flats",
    "tenants",
    "payments",
    "bills"
  ];


  sections.forEach(name => {

    const element = $(name);

    if (!element) return;

    element.classList.toggle(
      "hidden",
      name !== section
    );

  });


  $("title").textContent =
    section.charAt(0).toUpperCase() +
    section.slice(1);

}


/* -----------------------------
   LOGIN
----------------------------- */

$("lf").addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();


    $("lm").textContent = "";


    const button =
      $("loginBtn");


    button.disabled = true;

    button.textContent =
      "Signing in...";


    try {

      const email =
        $("email").value.trim();


      const password =
        $("pw").value;


      if (!email || !password) {

        throw new Error(
          "Please enter email and password."
        );

      }


      const {
        data,
        error
      } = await sb.auth.signInWithPassword({
        email,
        password
      });


      if (error) {
        throw error;
      }


      /*
        Normally SIGNED_IN event will
        call enterApplication().

        We don't manually reload the page.
      */

      if (data?.session) {

        await enterApplication(
          data.session
        );

      }


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      $("lm").textContent =
        error.message ||
        "Login failed.";

    } finally {

      button.disabled = false;

      button.textContent =
        "Sign in";

    }

  }
);


/* -----------------------------
   LOGOUT
----------------------------- */

$("logoutBtn").addEventListener(
  "click",
  async function () {

    try {

      await sb.auth.signOut();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }
);


/* -----------------------------
   START APPLICATION
----------------------------- */

init();
