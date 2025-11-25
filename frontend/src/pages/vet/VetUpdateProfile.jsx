import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../config/axiosConfig";

const regions = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
];

const comunasByRegion = {
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],
  "Tarapacá": [
    "Iquique",
    "Alto Hospicio",
    "Pozo Almonte",
    "Camiña",
    "Colchane",
    "Huara",
    "Pica",
  ],
  "Antofagasta": [
    "Antofagasta",
    "Mejillones",
    "Sierra Gorda",
    "Taltal",
    "Calama",
    "Ollagüe",
    "San Pedro de Atacama",
    "Tocopilla",
    "María Elena",
  ],
  Atacama: [
    "Copiapó",
    "Caldera",
    "Tierra Amarilla",
    "Chañaral",
    "Diego de Almagro",
    "Vallenar",
    "Alto del Carmen",
    "Freirina",
    "Huasco",
  ],
  Coquimbo: [
    "La Serena",
    "Coquimbo",
    "Andacollo",
    "La Higuera",
    "Paiguano",
    "Vicuña",
    "Illapel",
    "Canela",
    "Los Vilos",
    "Salamanca",
    "Ovalle",
    "Combarbalá",
    "Monte Patria",
    "Punitaqui",
    "Río Hurtado",
  ],
  Valparaíso: [
    "Valparaíso",
    "Casablanca",
    "Concón",
    "Juan Fernández",
    "Puchuncaví",
    "Quintero",
    "Viña del Mar",
    "Isla de Pascua",
    "Los Andes",
    "Calle Larga",
    "Rinconada",
    "San Esteban",
    "La Ligua",
    "Petorca",
    "Cabildo",
    "Papudo",
    "Zapallar",
    "Putaendo",
    "Santa María",
    "San Felipe",
    "Catemu",
    "Llaillay",
    "Nogales",
    "La Calera",
    "Hijuelas",
    "La Cruz",
    "Quillota",
    "Algarrobo",
    "Cartagena",
    "El Quisco",
    "El Tabo",
    "Santo Domingo",
    "San Antonio",
    "Algarrobo",
    "Cartagena",
    "El Quisco",
    "El Tabo",
    "Santo Domingo",
    "San Antonio",
  ],
  "Metropolitana de Santiago": [
    "Cerrillos",
    "Cerro Navia",
    "Conchalí",
    "El Bosque",
    "Estación Central",
    "Huechuraba",
    "Independencia",
    "La Cisterna",
    "La Florida",
    "La Granja",
    "La Pintana",
    "La Reina",
    "Las Condes",
    "Lo Barnechea",
    "Lo Espejo",
    "Lo Prado",
    "Macul",
    "Maipú",
    "Ñuñoa",
    "Pedro Aguirre Cerda",
    "Peñalolén",
    "Providencia",
    "Pudahuel",
    "Quilicura",
    "Quinta Normal",
    "Recoleta",
    "Renca",
    "San Joaquín",
    "San Miguel",
    "San Ramón",
    "Vitacura",
    "Puente Alto",
    "Pirque",
    "San José de Maipo",
    "Colina",
    "Lampa",
    "Tiltil",
    "San Bernardo",
    "Buin",
    "Calera de Tango",
    "Paine",
    "Melipilla",
    "Alhué",
    "Curacaví",
    "María Pinto",
    "San Pedro",
    "Talagante",
    "El Monte",
    "Isla de Maipo",
    "Padre Hurtado",
    "Peñaflor",
  ],
  "Libertador General Bernardo O'Higgins": [
    "Rancagua",
    "Codegua",
    "Coinco",
    "Coltauco",
    "Doñihue",
    "Graneros",
    "Las Cabras",
    "Machalí",
    "Malloa",
    "Mostazal",
    "Olivar",
    "Peumo",
    "Pichidegua",
    "Quinta de Tilcoco",
    "Rengo",
    "Requínoa",
    "San Vicente",
    "Pichilemu",
    "La Estrella",
    "Litueche",
    "Marchihue",
    "Navidad",
    "Paredones",
    "San Fernando",
    "Chépica",
    "Chimbarongo",
    "Lolol",
    "Nancagua",
    "Palmilla",
    "Peralillo",
    "Placilla",
    "Pumanque",
    "Santa Cruz",
  ],
  Maule: [
    "Talca",
    "Constitución",
    "Curepto",
    "Empedrado",
    "Maule",
    "Pelarco",
    "Pencahue",
    "Río Claro",
    "San Clemente",
    "San Rafael",
    "Cauquenes",
    "Chanco",
    "Pelluhue",
    "Curicó",
    "Hualañé",
    "Licantén",
    "Molina",
    "Rauco",
    "Romeral",
    "Sagrada Familia",
    "Teno",
    "Vichuquén",
    "Linares",
    "Colbún",
    "Longaví",
    "Parral",
    "Retiro",
    "San Javier",
    "Villa Alegre",
    "Yerbas Buenas",
  ],
  Ñuble: [
    "Chillán",
    "Bulnes",
    "Cobquecura",
    "Coelemu",
    "Coihueco",
    "Chillán Viejo",
    "El Carmen",
    "Ninhue",
    "Ñiquén",
    "Pemuco",
    "Pinto",
    "Portezuelo",
    "Quillón",
    "Quirihue",
    "Ránquil",
    "San Carlos",
    "San Fabián",
    "San Ignacio",
    "San Nicolás",
    "Treguaco",
    "Yungay",
  ],
  Biobío: [
    "Concepción",
    "Coronel",
    "Chiguayante",
    "Florida",
    "Hualqui",
    "Lota",
    "Penco",
    "San Pedro de la Paz",
    "Santa Juana",
    "Talcahuano",
    "Tomé",
    "Hualpén",
    "Lebu",
    "Arauco",
    "Cañete",
    "Contulmo",
    "Curanilahue",
    "Los Álamos",
    "Tirúa",
    "Los Ángeles",
    "Antuco",
    "Cabrero",
    "Laja",
    "Mulchén",
    "Nacimiento",
    "Negrete",
    "Quilaco",
    "Quilleco",
    "San Rosendo",
    "Santa Bárbara",
    "Tucapel",
    "Yumbel",
    "Alto Biobío",
  ],
  "La Araucanía": [
    "Temuco",
    "Carahue",
    "Cunco",
    "Curarrehue",
    "Freire",
    "Galvarino",
    "Gorbea",
    "Lautaro",
    "Loncoche",
    "Melipeuco",
    "Nueva Imperial",
    "Padre las Casas",
    "Perquenco",
    "Pitrufquén",
    "Pucón",
    "Saavedra",
    "Teodoro Schmidt",
    "Toltén",
    "Vilcún",
    "Villarrica",
    "Cholchol",
    "Angol",
    "Collipulli",
    "Curacautín",
    "Ercilla",
    "Lonquimay",
    "Los Sauces",
    "Lumaco",
    "Purén",
    "Renaico",
    "Traiguén",
    "Victoria",
  ],
  "Los Ríos": [
    "Valdivia",
    "Corral",
    "Lanco",
    "Los Lagos",
    "Máfil",
    "Mariquina",
    "Paillaco",
    "Panguipulli",
    "La Unión",
    "Futrono",
    "Lago Ranco",
    "Río Bueno",
  ],
  "Los Lagos": [
    "Puerto Montt",
    "Calbuco",
    "Cochamó",
    "Fresia",
    "Frutillar",
    "Los Muermos",
    "Llanquihue",
    "Maullín",
    "Puerto Varas",
    "Castro",
    "Ancud",
    "Chonchi",
    "Curaco de Vélez",
    "Dalcahue",
    "Puqueldón",
    "Queilén",
    "Quellón",
    "Quemchi",
    "Quinchao",
    "Osorno",
    "Puerto Octay",
    "Purranque",
    "Puyehue",
    "Río Negro",
    "San Juan de la Costa",
    "San Pablo",
    "Chaitén",
    "Futaleufú",
    "Hualaihué",
    "Palena",
  ],
  "Aysén del General Carlos Ibáñez del Campo": [
    "Coyhaique",
    "Lago Verde",
    "Aysén",
    "Cisnes",
    "Guaitecas",
    "Cochrane",
    "O'Higgins",
    "Tortel",
    "Chile Chico",
    "Río Ibáñez",
  ],
  "Magallanes y de la Antártica Chilena": [
    "Punta Arenas",
    "Laguna Blanca",
    "Río Verde",
    "San Gregorio",
    "Cabo de Hornos",
    "Antártica",
    "Porvenir",
    "Primavera",
    "Timaukel",
    "Natales",
    "Torres del Paine",
  ],
};

const VetUpdateProfile = () => {
  const navigate = useNavigate();
  const [vet, setVet] = useState({
    _id: "",
    nationalId: "",
    name: "",
    email: "",
    phoneNumber: "",
    specialization: "",
    qualifications: "",
    region: "",
    comuna: "",
    profileImage: "",
    supportsEmergency: false,
    availableNow: false,
    teleconsultationsEnabled: false,
    vetType: "independent",
    verificationStatus: "",
    platformRole: "",
    clinicRut: "",
    legalName: "",
    clinicAddress: {
      street: "",
      number: "",
      commune: "",
      region: "",
      reference: ""
    },
    openingHours: [],
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Estado para cambio de correo con OTP
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailChangeStatus, setEmailChangeStatus] = useState("");

  useEffect(() => {
    const fetchVetInfo = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          navigate("/login");
          return;
        }

        const { id } = JSON.parse(storedUser);
        if (!id) {
          console.error("No user ID found in localStorage");
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `/api/vets/personalinfo/${id}`
        );
        const fetchedVet = response.data || {};
        const coordinates = fetchedVet.location?.coordinates;
        setVet((prev) => ({
          ...prev,
          ...fetchedVet,
          vetType: fetchedVet.vetType || fetchedVet.type || "independent",
          supportsEmergency: !!fetchedVet?.supportsEmergency,
          availableNow: !!fetchedVet?.availableNow,
          teleconsultationsEnabled: !!fetchedVet?.teleconsultationsEnabled,
          verificationStatus: fetchedVet?.verificationStatus || prev.verificationStatus,
          platformRole: fetchedVet?.platformRole || prev.platformRole,
          clinicRut: fetchedVet?.clinicRut || prev.clinicRut || "",
          legalName: fetchedVet?.legalName || prev.legalName || "",
          clinicAddress: fetchedVet?.clinicAddress || prev.clinicAddress || {
            street: "",
            number: "",
            commune: "",
            region: "",
            reference: ""
          },
          openingHours: fetchedVet?.openingHours || [],
        }));
        setPreview(fetchedVet.profileImage || "");
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch vet info:", err);
        setError(err.message);
        setLoading(false);

        if (err.response?.status === 404) {
          alert("Perfil de veterinario no encontrado. Redirigiendo al dashboard.");
          navigate("/vet-dashboard");
        } else if (err.response?.status === 401) {
          alert("Sesión expirada. Por favor inicia sesión nuevamente.");
          navigate("/login");
        } else {
          alert("Error al cargar el perfil. Por favor intenta nuevamente.");
        }
      }
    };

    fetchVetInfo();
  }, [navigate]);


  const handleChange = (e) => {
    const { name, value } = e.target;

    // Reset comuna if region changes
    if (name === "region") {
      setVet((prev) => ({ ...prev, region: value, comuna: "" }));
    } else if (name === "supportsEmergency" || name === "availableNow" || name === "teleconsultationsEnabled") {
      setVet((prev) => ({ ...prev, [name]: e.target.checked }));
    } else if (name === "vetType") {
      setVet((prev) => ({ ...prev, vetType: value }));
    } else {
      setVet((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      
      // Asegurar que teleconsultationsEnabled siempre se envíe explícitamente
      formData.append("teleconsultationsEnabled", vet.teleconsultationsEnabled === true ? "true" : "false");
      formData.append("supportsEmergency", vet.supportsEmergency === true ? "true" : "false");
      formData.append("availableNow", vet.availableNow === true ? "true" : "false");
      
      for (const key in vet) {
        if (["profileImage", "locationLat", "locationLng", "location", "teleconsultationsEnabled", "supportsEmergency", "availableNow"].includes(key)) continue;
        if (key === "clinicAddress" && vet[key]) {
          // Enviar clinicAddress como JSON string
          formData.append(key, JSON.stringify(vet[key]));
        } else if (vet[key] !== undefined && vet[key] !== null) {
          formData.append(key, vet[key]);
        }
      }
      if (profileImageFile) {
        formData.append("profileImage", profileImageFile);
      }
      await axios.put(
        `/api/vets/update/${vet._id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // Mostrar mensaje de éxito y mantener en la misma página
      setSaveSuccess(true);
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      // Recargar los datos del veterinario desde el servidor para reflejar los cambios guardados
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const { id } = JSON.parse(storedUser);
        try {
          const response = await axios.get(`/api/vets/personalinfo/${id}`);
          const fetchedVet = response.data || {};
          console.log('Datos recargados después de guardar:', {
            teleconsultationsEnabled: fetchedVet.teleconsultationsEnabled,
            supportsEmergency: fetchedVet.supportsEmergency,
            availableNow: fetchedVet.availableNow
          });
          setVet((prev) => ({
            ...prev,
            ...fetchedVet,
            vetType: fetchedVet.vetType || fetchedVet.type || "independent",
            supportsEmergency: !!fetchedVet?.supportsEmergency,
            availableNow: !!fetchedVet?.availableNow,
            teleconsultationsEnabled: !!fetchedVet?.teleconsultationsEnabled,
            clinicAddress: fetchedVet?.clinicAddress || prev.clinicAddress || {
              street: "",
              number: "",
              commune: "",
              region: "",
              reference: ""
            },
            openingHours: fetchedVet?.openingHours || prev.openingHours || [],
          }));
        } catch (refreshError) {
          console.error("Error al actualizar datos después de guardar:", refreshError);
          // No mostrar error al usuario si falla la actualización, ya guardamos exitosamente
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error al actualizar el perfil. Por favor intenta nuevamente.");
    }
  };


  const isVerified = (vet?.verificationStatus === "verified") || !!vet?.isApproved;

  // Flujo de cambio de correo con OTP (usa endpoints existentes)
  const sendEmailCode = async () => {
    try {
      setEmailChangeStatus("Enviando código…");
      await axios.post(`/api/send-token/toemail`, { email: newEmail });
      setEmailChangeStatus("Código enviado. Revisa tu correo nuevo.");
    } catch (e) {
      setEmailChangeStatus("No se pudo enviar el código. Verifica el correo.");
    }
  };

  const verifyEmailCode = async () => {
    try {
      setEmailChangeStatus("Verificando…");
      const res = await axios.post(`/api/send-token/verify-token`, { email: newEmail, token: emailOtp });
      if (res?.data?.success) {
        setEmailChangeStatus("Correo verificado. No olvides guardar cambios.");
        setVet((v) => ({ ...v, email: newEmail }));
        setShowEmailModal(false);
      } else {
        setEmailChangeStatus("Código inválido. Intenta nuevamente.");
      }
    } catch (e) {
      setEmailChangeStatus("Error al verificar el código.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar el perfil: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Mensaje de éxito */}
      {saveSuccess && (
        <div className="sticky top-0 z-50 bg-green-50 border-b border-green-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-700 font-medium">Perfil guardado exitosamente</p>
          </div>
        </div>
      )}
      
      <div className={`sticky ${saveSuccess ? 'top-[49px]' : 'top-0'} z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tu perfil profesional</h1>
            <p className="text-sm text-gray-500">Mantén tu información actualizada para que los tutores te encuentren fácilmente.</p>
          </div>
          <button
            onClick={handleSubmit}
            className="hidden md:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Guardar
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Identidad */}
          <section className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Identidad</h2>
              <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">Público</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <img
                  src={preview || "https://ui-avatars.com/api/?name=Vet&background=0EA5E9&color=FFFFFF"}
                  alt="Foto de perfil"
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border shadow-sm"
                />
                <label className="absolute -bottom-2 -right-1 bg-white border shadow-sm rounded-full p-2 cursor-pointer">
                  <input type="file" onChange={handleImageChange} accept="image/*" className="hidden" />
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M4 13l6 6L20 9l-6-6L4 13z" />
                  </svg>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre profesional</label>
                  <input
                    type="text"
                    name="name"
                    value={vet.name}
                    onChange={handleChange}
                    placeholder="Ej: Clínica Vet Plaza Demo o Dr(a). Nombre Apellido"
                    required
                    disabled={isVerified}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none ${isVerified ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <p className="mt-1 text-xs text-gray-500">Así se mostrará a los tutores.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo de contacto</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      name="email"
                      value={vet.email}
                      readOnly
                      placeholder="contacto@tuclinica.cl"
                      className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-black"
                    />
                    <button
                      type="button"
                      onClick={() => { setNewEmail(""); setEmailOtp(""); setEmailChangeStatus(""); setShowEmailModal(true); }}
                      className="px-3 py-2 border rounded-lg text-sm text-violet-700 border-violet-300 hover:bg-violet-50"
                      title="Cambiar correo (requiere verificación por código)"
                    >
                      Cambiar correo
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Usado para notificaciones.</p>
                </div>
                {/* RUT personal solo lectura */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                  <input
                    type="text"
                    name="nationalId"
                    value={vet.nationalId || ""}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-black"
                    placeholder="12.345.678-9"
                  />
                  <p className="mt-1 text-xs text-gray-500">Para modificar este dato, contacta a soporte: soporte@vetgonow.com</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={vet.phoneNumber}
                    onChange={handleChange}
                    placeholder="+56 9 1234 5678"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  />
                  <p className="mt-1 text-xs text-gray-500">Visible para el tutor si es necesario.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                  <input
                    type="text"
                    name="specialization"
                    value={vet.specialization}
                    onChange={handleChange}
                    placeholder="Ej: Medicina general, Pequeños animales, Felinos"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">Tu foco principal de atención.</p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Universidad / Estudios</label>
              <input
                type="text"
                name="qualifications"
                value={vet.qualifications || ""}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-black"
                placeholder="Ej: Universidad de Chile, Diplomado en Anestesia"
              />
              <p className="mt-1 text-xs text-gray-500">Basado en el título que ingresaste durante el registro. Para modificar, contacta a soporte: soporte@vetgonow.com</p>
            </div>
          </section>

        {/* Datos legales de la clínica (solo lectura) */}
        {vet.vetType === "clinic" && (
          <section className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-5">Datos legales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">RUT de la clínica</label>
                <input
                  type="text"
                  value={vet.clinicRut || ""}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Gestionado por el equipo de verificación.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Razón social</label>
                <input
                    type="text"
                    value={vet.legalName || ""}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed"
                  />                
              </div>
            </div>
          </section>
        )}

        {/* Dirección de la clínica (solo para clínicas) */}
        {vet.vetType === "clinic" && (
          <section className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-5">Dirección de la clínica</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección completa
                  </label>
                  <input
                    type="text"
                    value={vet.clinicAddress?.reference || `${vet.clinicAddress?.street || ""} ${vet.clinicAddress?.number || ""}, ${vet.clinicAddress?.commune || ""}`.trim() || ""}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-sm"
                    placeholder="La dirección se completa abajo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vet.clinicAddress?.street || ""}
                    onChange={(e) => setVet(prev => ({
                      ...prev,
                      clinicAddress: {
                        ...prev.clinicAddress,
                        street: e.target.value
                      }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="Av. Providencia"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vet.clinicAddress?.number || ""}
                    onChange={(e) => setVet(prev => ({
                      ...prev,
                      clinicAddress: {
                        ...prev.clinicAddress,
                        number: e.target.value
                      }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="1234"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comuna <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vet.clinicAddress?.commune || ""}
                    onChange={(e) => setVet(prev => ({
                      ...prev,
                      clinicAddress: {
                        ...prev.clinicAddress,
                        commune: e.target.value
                      }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="Providencia"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Región <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vet.clinicAddress?.region || ""}
                    onChange={(e) => setVet(prev => ({
                      ...prev,
                      clinicAddress: {
                        ...prev.clinicAddress,
                        region: e.target.value
                      }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="Metropolitana de Santiago"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia (opcional)
                  </label>
                  <input
                    type="text"
                    value={vet.clinicAddress?.reference || ""}
                    onChange={(e) => setVet(prev => ({
                      ...prev,
                      clinicAddress: {
                        ...prev.clinicAddress,
                        reference: e.target.value
                      }
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="Ej: Edificio Plaza, 2do piso"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Información adicional para ayudar a los tutores a encontrar la clínica.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

          {/* Ubicación y cobertura */}
          <section className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-5">Ubicación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Región</label>
                <select
                  name="region"
                  value={vet.region}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  required
                >
                  <option value="">Seleccionar Región</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Indica la región donde atiendes normalmente.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Comuna</label>
                <select
                  name="comuna"
                  value={vet.comuna}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  required
                  disabled={!vet.region}
                >
                  <option value="">Seleccionar Comuna</option>
                  {vet.region &&
                    comunasByRegion[vet.region] &&
                    comunasByRegion[vet.region].map((comuna) => (
                      <option key={comuna} value={comuna}>
                        {comuna}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Selecciona la comuna principal donde ejerces.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de veterinario</label>
                <select
                  name="vetType"
                  value={vet.vetType || "independent"}
                  onChange={handleChange}
                  disabled
                  className="w-full p-3 border rounded-lg focus:ring-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                >
                  <option value="independent">Independiente (a domicilio)</option>
                  <option value="clinic">Clínica</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Si eres clínica podrás ofrecer atenciones presenciales.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Urgencias</label>
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: "supportsEmergency", checked: !vet.supportsEmergency } })}
                  className={`w-full p-3 border rounded-lg transition text-left ${vet.supportsEmergency ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50"}`}
                >
                  {vet.supportsEmergency ? "Atiendo urgencias (activado)" : "No atiendo urgencias (toque para activar)"}
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  Activa si puedes responder a casos urgentes.
                </p>
              </div>
            </div>

            {vet.supportsEmergency && (
              <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>📍 Ubicación para urgencias:</strong> Tu ubicación se detectará automáticamente en tiempo real cuando estés atendiendo una urgencia, para mostrar tu posición en el mapa al tutor. 
                  {vet.vetType === "clinic" 
                    ? " La dirección de tu clínica es fija y se usa como referencia." 
                    : " No es necesario configurar una ubicación fija ya que no recibes visitas presenciales."}
                </p>
              </div>
            )}

            <div className="mt-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Teleconsultas</label>
              <button
                type="button"
                onClick={() => handleChange({ target: { name: "teleconsultationsEnabled", checked: !vet.teleconsultationsEnabled } })}
                className={`w-full p-3 border rounded-lg transition text-left ${vet.teleconsultationsEnabled ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-gray-50"}`}
              >
                {vet.teleconsultationsEnabled ? "Teleconsultas habilitadas (activado)" : "Teleconsultas deshabilitadas (toque para activar)"}
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Activa si quieres recibir solicitudes de teleconsultas por videollamada. Los usuarios podrán agendar citas de telemedicina contigo.
              </p>
            </div>

            <div className={`mt-5 transition-all duration-300 ${vet.supportsEmergency ? 'opacity-100' : 'opacity-50'}`}>
              <label className={`flex items-center gap-2 border rounded-lg p-3 transition-all ${
                vet.supportsEmergency 
                  ? 'bg-gray-50 cursor-pointer hover:bg-gray-100' 
                  : 'bg-gray-100 cursor-not-allowed'
              }`}>
                <input
                  type="checkbox"
                  name="availableNow"
                  checked={!!vet.availableNow}
                  onChange={handleChange}
                  disabled={!vet.supportsEmergency}
                  className={!vet.supportsEmergency ? 'cursor-not-allowed' : ''}
                />
                <span className={!vet.supportsEmergency ? 'text-gray-500' : ''}>
                  Disponible ahora (para urgencias)
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                {vet.supportsEmergency 
                  ? "Si está activo, te mostraremos como \"En línea\" y podrás recibir solicitudes de urgencias en tiempo real. Las citas programadas se pueden agendar independientemente de este estado."
                  : "Activa \"Urgencias\" arriba para poder estar disponible para urgencias."}
              </p>
            </div>
          </section>


          {/* Guardar (solo visible en mobile) */}
          <div className="lg:hidden sticky bottom-0 bg-white/90 backdrop-blur border-t p-4">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition">
              Guardar cambios
            </button>
          </div>
        </form>

        {/* Vista previa */}
        <aside className="space-y-6">
          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-semibold mb-4 text-gray-900">Vista previa pública</h3>
            <div className="flex items-center gap-4">
              <img
                src={preview || "https://ui-avatars.com/api/?name=Vet&background=0EA5E9&color=FFFFFF"}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border"
              />
              <div>
                <p className="font-semibold text-gray-900">{vet.name || "Nombre del profesional"}</p>
                <p className="text-sm text-gray-600">{vet.specialization || "Especialidad"}</p>
                <p className="text-xs text-gray-500">{vet.region && vet.comuna ? `${vet.comuna}, ${vet.region}` : "Ubicación"}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 border p-3">
                <p className="text-xs text-gray-500">Urgencias</p>
                <p className={`font-semibold ${vet.supportsEmergency ? "text-emerald-700" : "text-gray-700"}`}>
                  {vet.supportsEmergency ? "Sí" : "No"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 border p-3">
                <p className="text-xs text-gray-500">Disponibilidad</p>
                <p className={`font-semibold ${vet.availableNow ? "text-emerald-700" : "text-gray-700"}`}>
                  {vet.availableNow ? "En línea" : "Fuera de línea"}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <button
              onClick={handleSubmit}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Guardar cambios
            </button>
          </div>
        </aside>
      </div>

      {/* Modal para cambio de correo */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Cambiar correo electrónico</h3>
            <label className="block text-sm font-medium mb-1">Nuevo correo</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e)=>setNewEmail(e.target.value)}
              className="w-full mb-3 px-3 py-2 border rounded"
              placeholder="nuevo@correo.cl"
            />
            <div className="flex items-center gap-2 mb-3">
              <button type="button" onClick={sendEmailCode} className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700">Enviar código</button>
              <span className="text-sm text-gray-600">{emailChangeStatus}</span>
            </div>
            <label className="block text-sm font-medium mb-1">Código de verificación</label>
            <input
              type="text"
              value={emailOtp}
              onChange={(e)=>setEmailOtp(e.target.value)}
              className="w-full mb-4 px-3 py-2 border rounded"
              placeholder="Código recibido"
            />
            <div className="flex items-center justify-end gap-3">
              <button className="px-4 py-2 border rounded" onClick={()=>setShowEmailModal(false)}>Cancelar</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={verifyEmailCode}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetUpdateProfile;
