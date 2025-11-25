import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import GoogleMapWrapper from '../../components/GoogleMapWrapper';
import IDVerificationModalHuman from "../../components/auth/IDVerificationModalHuman";

// Constante estática para las librerías de Google Maps (fuera del componente para evitar re-renders)
const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry'];

const SERVICES = [
  { key: "consultas", label: "Consultas en clínica" },
  { key: "video-consultas", label: "Video consultas" },
  { key: "a-domicilio", label: "Atención a domicilio" },
];

// Comunas de la Región Metropolitana
const COMUNAS_RM = [
  "Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí",
  "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia",
  "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina",
  "Lampa", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú",
  "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Pedro Aguirre Cerda", "Peñaflor",
  "Peñalolén", "Pirque", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "Quinta Normal",
  "Recoleta", "Renca", "San Bernardo", "San Joaquín", "San José de Maipo", "San Miguel",
  "San Pedro", "San Ramón", "Santiago", "Talagante", "Tiltil", "Vitacura"
];

const VetRegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  // Wizard: 1) Cuenta, 2) Tipo y servicios, 3) Documentos y selfie
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const goNext = () => setCurrentStep((s) => Math.min(totalSteps, s + 1));
  const goBack = () => setCurrentStep((s) => Math.max(1, s - 1));
  
  // Detectar tipo desde URL
  const isClinic = location.pathname.includes('/clinic');
  const vetType = isClinic ? 'clinic' : 'independent';
  
  // Estados comunes
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameFather, setLastNameFather] = useState("");
  const [lastNameMother, setLastNameMother] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [nationalIdDocument, setNationalIdDocument] = useState(null);
  const [idVerificationData, setIdVerificationData] = useState(null);
  const [isIDVerificationOpen, setIsIDVerificationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [rutError, setRutError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  
  // Estados para veterinario independiente
  const [contactPhone, setContactPhone] = useState("");
  const [contactPhoneLocal, setContactPhoneLocal] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [serviceModalities, setServiceModalities] = useState([]);
  const [coverageCommunes, setCoverageCommunes] = useState([]);
  const [isCommuneDropdownOpen, setIsCommuneDropdownOpen] = useState(false);
  const [communeSearchTerm, setCommuneSearchTerm] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [profileDescription, setProfileDescription] = useState("");
  const [siiActivityStartDocument, setSiiActivityStartDocument] = useState(null);
  
  // Estados para clínica
  const [clinicRut, setClinicRut] = useState("");
  const [clinicRutFormatted, setClinicRutFormatted] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicPhoneLocal, setClinicPhoneLocal] = useState("");
  const [clinicMobile, setClinicMobile] = useState("");
  const [clinicMobileLocal, setClinicMobileLocal] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState({ instagram: "", facebook: "", other: "" });
  const [clinicAddress, setClinicAddress] = useState({
    street: "",
    number: "",
    commune: "",
    region: "",
    reference: ""
  });
  const [clinicLocation, setClinicLocation] = useState({ lat: null, lng: null });
  const [mapCenter, setMapCenter] = useState({ lat: -33.4489, lng: -70.6693 }); // Santiago centro
  const [selectedPlace, setSelectedPlace] = useState(null);
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);
  
  // Google Maps
  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });
  const [technicalResponsible, setTechnicalResponsible] = useState({
    name: "",
    rut: "",
    email: "",
    phone: ""
  });
  const [technicalResponsiblePhoneLocal, setTechnicalResponsiblePhoneLocal] = useState("");
  const [userRole, setUserRole] = useState("");
  const [inPersonServices, setInPersonServices] = useState([]);
  const [supportsInPersonEmergency, setSupportsInPersonEmergency] = useState(false);
  const [supportsEmergency, setSupportsEmergency] = useState(false);
  const [additionalModalities, setAdditionalModalities] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [municipalLicenseDocument, setMunicipalLicenseDocument] = useState(null);
  const [technicalResponsibleTitleDocument, setTechnicalResponsibleTitleDocument] = useState(null);
  const [representationDocument, setRepresentationDocument] = useState(null);
  const [seremiAuthorization, setSeremiAuthorization] = useState(null);
  const [sagAuthorization, setSagAuthorization] = useState(null);
  const [clinicPhotos, setClinicPhotos] = useState([]);
  
  // Estados para servicios (común pero con validación diferente)
  const [services, setServices] = useState([]);
  
  // Declaraciones
  const [declarations, setDeclarations] = useState({
    acceptedTerms: false,
    acceptedPrivacy: false,
    informationIsTruthful: false,
    hasAuthorization: false
  });

  const toggleService = (svc) => {
    setServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  const handleSendToken = async () => {
    if (!email) {
      setError("Por favor ingresa tu correo electrónico primero.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/send-token/toemail`, { email });
      setTokenError(""); // Limpiar errores previos
      setIsTokenVerified(false); // Resetear verificación si se solicita nuevo código
      setToken(""); // Limpiar código anterior
      // Mostrar mensaje de éxito temporalmente
      const successMsg = "Código de verificación enviado a tu correo electrónico.";
      setError("");
      alert(successMsg);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "No se pudo enviar el código de verificación. Verifica tu correo e intenta nuevamente.";
      setError(errorMessage);
      console.error("Error enviando token:", err);
    }
  };

  // Helpers de formato/validación Chile
  const normalizeRut = (val = "") => val.replace(/[^0-9kK]/g, "").toUpperCase();
  const formatRut = (raw = "") => {
    const clean = normalizeRut(raw);
    if (clean.length === 0) return "";
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${withDots}-${dv}`;
  };
  const validateRut = (rut = "") => {
    const clean = normalizeRut(rut);
    if (clean.length < 2) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i], 10) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const res = 11 - (sum % 11);
    const dvCalc = res === 11 ? "0" : res === 10 ? "K" : String(res);
    return dvCalc === dv;
  };
  const formatPhoneCl = (raw = "") => {
    let v = raw.replace(/\s+/g, "");
    if (!v.startsWith("+56")) v = "+56" + v.replace(/^\+?56/, "");
    v = v.replace(/[^+\d]/g, "");
    // mantener máximo +56 9XXXXXXXX (12-13 caracteres)
    if (v.length > 12) v = v.slice(0, 12);
    return v;
  };
  const validatePhoneCl = (val = "") => /^\+56(9\d{8}|\d{8})$/.test(val.replace(/\s+/g, ""));
  const sanitizeLocalPhone = (raw = "") => raw.replace(/\D/g, "").slice(0, 9);
  const formatLocalPhoneDisplay = (digits = "") => {
    const d = digits.slice(0, 9);
    if (d.length <= 1) return d;
    if (d.length <= 5) return `${d.slice(0, 1)} ${d.slice(1)}`;
    return `${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5)}`;
  };
  
  // Formatear teléfono fijo chileno (formato: +56 2 XXXX XXXX)
  const formatFixedPhone = (raw = "") => {
    let v = raw.replace(/\D/g, "");
    if (v.length === 0) return "";
    if (v.length <= 2) return v;
    if (v.length <= 6) return `${v.slice(0, 2)} ${v.slice(2)}`;
    return `${v.slice(0, 2)} ${v.slice(2, 6)} ${v.slice(6, 10)}`;
  };
  
  const sanitizeFixedPhone = (raw = "") => raw.replace(/\D/g, "").slice(0, 10);
  
  // Manejar cambio de dirección desde Autocomplete
  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setClinicLocation({ lat, lng });
        setSelectedPlace(place);
        
        // Extraer componentes de la dirección
        const addressComponents = place.address_components || [];
        let street = "";
        let number = "";
        let commune = "";
        let region = "";
        
        addressComponents.forEach(component => {
          const types = component.types;
          if (types.includes('route')) {
            street = component.long_name;
          }
          if (types.includes('street_number')) {
            number = component.long_name;
          }
          if (types.includes('administrative_area_level_2') || types.includes('locality')) {
            commune = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            region = component.long_name;
          }
        });
        
        setClinicAddress(prev => ({
          ...prev,
          street: street || prev.street,
          number: number || prev.number,
          commune: commune || prev.commune,
          region: region || prev.region,
          reference: place.formatted_address || prev.reference
        }));
      }
    }
  }, []);
  
  // Manejar clic en el mapa
  const onMapClick = useCallback((e) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setClinicLocation({ lat, lng });
      setMapCenter({ lat, lng });
      
      // Geocodificación inversa para obtener la dirección
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const place = results[0];
            setSelectedPlace(place);
            
            const addressComponents = place.address_components || [];
            let street = "";
            let number = "";
            let commune = "";
            let region = "";
            
            addressComponents.forEach(component => {
              const types = component.types;
              if (types.includes('route')) {
                street = component.long_name;
              }
              if (types.includes('street_number')) {
                number = component.long_name;
              }
              if (types.includes('administrative_area_level_2') || types.includes('locality')) {
                commune = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                region = component.long_name;
              }
            });
            
            setClinicAddress(prev => ({
              ...prev,
              street: street || prev.street,
              number: number || prev.number,
              commune: commune || prev.commune,
              region: region || prev.region,
              reference: place.formatted_address || prev.reference
            }));
          }
        });
      }
    }
  }, []);

  const handleVerifyToken = async () => {
    // Prevenir doble clic o verificación si ya está verificado
    if (isTokenVerified || isVerifyingToken) {
      return;
    }

    if (!token || !email) {
      setTokenError("Por favor ingresa el código de verificación.");
      return;
    }

    setTokenError("");
    setIsVerifyingToken(true);
    
    try {
      const res = await axios.post(`${API_BASE}/api/send-token/verify-token`, {
        email,
        token,
      });

      if (res.data?.success) {
        setIsTokenVerified(true);
        setTokenError("");
      } else {
        setIsTokenVerified(false);
        setTokenError("Código inválido o expirado. Verifica el código o solicita uno nuevo.");
      }
    } catch (err) {
      setIsTokenVerified(false);
      const errorMessage = err.response?.data?.message || "Error al verificar el código. Intenta nuevamente.";
      setTokenError(errorMessage);
      console.error("Error verificando token:", err);
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validación completa del Paso 1
    if (isClinic) {
      // Validación para clínica - Paso 1: Datos de la empresa
      if (!clinicRut || !legalName || !tradeName || !clinicMobile || !clinicEmail) {
        setError("Completa todos los campos obligatorios de la clínica (RUT, razón social, nombre de fantasía, teléfono móvil y email).");
        setCurrentStep(1);
        return;
      }
      if (!isTokenVerified) {
        setError("Por favor verifica el correo electrónico de la clínica antes de completar el registro. Ingresa el código que recibiste y haz clic en 'Verificar'.");
        setCurrentStep(1);
        return;
      }
      if (!clinicAddress.street || !clinicAddress.number || !clinicAddress.commune || !clinicAddress.region) {
        setError("Completa todos los campos de la dirección de la clínica.");
        setCurrentStep(1);
        return;
      }
      // Validación de cuenta de acceso (administrador)
      if (!firstName || !nationalId || !phoneNumber || !password || !confirmPassword) {
        setError("Completa todos los campos de la cuenta de acceso (nombre del administrador, RUT, teléfono y contraseña).");
        setCurrentStep(1);
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setCurrentStep(1);
        return;
      }
      if (!validateRut(nationalId)) {
        setRutError("RUT chileno inválido");
        setError("RUT del administrador inválido. Por favor verifica el RUT ingresado.");
        setCurrentStep(1);
        return;
      }
      if (!validatePhoneCl(phoneNumber)) {
        setPhoneError("Teléfono inválido. Formato esperado: +569XXXXXXXX");
        setError("Teléfono del administrador inválido. Formato esperado: +569XXXXXXXX");
        setCurrentStep(1);
        return;
      }
    } else {
      // Validación para veterinario independiente - Paso 1: Cuenta
      if (!firstName || !lastNameFather || !email || !nationalId || !phoneNumber || !password || !confirmPassword) {
        setError("Completa todos los campos obligatorios del Paso 1.");
        setCurrentStep(1);
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setCurrentStep(1);
        return;
      }
      if (!isTokenVerified) {
        setError("Por favor verifica tu correo electrónico antes de completar el registro. Ingresa el código que recibiste y haz clic en 'Verificar'.");
        setCurrentStep(1);
        return;
      }
      if (!validateRut(nationalId)) {
        setRutError("RUT chileno inválido");
        setError("RUT chileno inválido. Por favor verifica el RUT ingresado.");
        setCurrentStep(1);
        return;
      }
      if (!validatePhoneCl(phoneNumber)) {
        setPhoneError("Teléfono inválido. Formato esperado: +569XXXXXXXX");
        setError("Teléfono inválido. Formato esperado: +569XXXXXXXX");
        setCurrentStep(1);
        return;
      }
    }

    // Validación completa del Paso 2
    if (isClinic) {
      // Validación para clínica - Paso 2: Responsable técnico
      if (!technicalResponsible.name || !technicalResponsible.rut || !technicalResponsible.email) {
        setError("Completa todos los datos del responsable técnico (nombre, RUT y email).");
        setCurrentStep(2);
        return;
      }
      if (!userRole) {
        setError("Selecciona tu rol en la clínica.");
        setCurrentStep(2);
        return;
      }
    } else {
      // Validaciones para veterinario independiente - Paso 2: Tipo y servicios
      if (serviceModalities.includes('domicilio') && coverageCommunes.length === 0) {
        setError("Si ofreces atención a domicilio, debes seleccionar al menos una comuna de cobertura.");
        setCurrentStep(2);
        return;
      }
    }

    // Validación completa del Paso 3
    if (!certificateFile) {
      setError("Por favor sube tu título o acreditación veterinaria.");
      setCurrentStep(3);
      return;
    }
    if (!nationalIdDocument) {
      setError("Debes subir la foto o escaneo de tu cédula de identidad.");
      setCurrentStep(3);
      return;
    }
    
    // Validaciones específicas por tipo en Paso 3
    if (isClinic) {
      if (!municipalLicenseDocument || !technicalResponsibleTitleDocument) {
        setError("Debes subir la patente municipal y el título del responsable técnico.");
        setCurrentStep(3);
        return;
      }
    } else {
      if (!siiActivityStartDocument) {
        setError("Debes subir el documento de inicio de actividades SII.");
        setCurrentStep(3);
        return;
      }
    }

    // Validación de declaraciones
    if (!declarations.acceptedTerms || !declarations.acceptedPrivacy || !declarations.informationIsTruthful) {
      setError("Debes aceptar todos los términos y declaraciones.");
      setCurrentStep(3);
      return;
    }
    if (isClinic && !declarations.hasAuthorization) {
      setError("Debes aceptar que tienes autorización para registrar esta clínica.");
      setCurrentStep(3);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      // Datos comunes de cuenta
      if (isClinic) {
        // Para clínica: nombre del administrador
        formData.append("name", firstName || name);
        formData.append("email", clinicEmail); // Email de la clínica para la cuenta
      } else {
        // Para independiente: nombre completo
        const composedName = [firstName, lastNameFather, lastNameMother].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        formData.append("name", composedName || name);
        formData.append("email", email);
      }
      formData.append("phoneNumber", phoneNumber);
      formData.append("password", password);
      formData.append("nationalId", nationalId);
      formData.append("role", "Vet");
      formData.append("vetType", vetType);
      formData.append("platformRole", isClinic ? "CLINICA" : "VET_INDEPENDIENTE");
      formData.append("certificate", certificateFile);
      // Verificación de identidad temporalmente deshabilitada (bypass)
      // Las imágenes de la cédula y selfie vienen del modal de verificación
      // if (idVerificationData) {
      //   // Convertir base64 a Blob
      //   const frontIdBlob = await fetch(idVerificationData.frontId).then(r => r.blob());
      //   const backIdBlob = await fetch(idVerificationData.backId).then(r => r.blob());
      //   const selfieBlob = await fetch(idVerificationData.selfie).then(r => r.blob());
      //   
      //   formData.append("frontIdImage", frontIdBlob, "front-id.jpg");
      //   formData.append("backIdImage", backIdBlob, "back-id.jpg");
      //   formData.append("faceImage", selfieBlob, "selfie.jpg");
      // }
      formData.append("token", token);
      
      // Declaraciones
      formData.append("declarations", JSON.stringify(declarations));

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }
      
      // Datos según tipo
      if (isClinic) {
        // Datos de clínica
        formData.append("clinicRut", clinicRut);
        formData.append("legalName", legalName);
        formData.append("tradeName", tradeName);
        formData.append("clinicPhone", clinicPhone || "");
        formData.append("clinicMobile", clinicMobile);
        formData.append("clinicEmail", clinicEmail);
        formData.append("website", website || "");
        formData.append("socialMedia", JSON.stringify(socialMedia));
        formData.append("clinicAddress", JSON.stringify(clinicAddress));
        if (clinicLocation.lat && clinicLocation.lng) {
          formData.append("lat", clinicLocation.lat);
          formData.append("lng", clinicLocation.lng);
        }
        formData.append("technicalResponsible", JSON.stringify(technicalResponsible));
        formData.append("userRole", userRole);
        formData.append("inPersonServices", JSON.stringify(inPersonServices));
        formData.append("supportsInPersonEmergency", supportsInPersonEmergency);
        // Urgencias a domicilio (bandera general)
        formData.append("supportsEmergency", supportsEmergency);
        formData.append("additionalModalities", JSON.stringify(additionalModalities));
        formData.append("openingHours", JSON.stringify(openingHours));
        
        // Documentos de clínica
        formData.append("municipalLicenseDocument", municipalLicenseDocument);
        formData.append("technicalResponsibleTitleDocument", technicalResponsibleTitleDocument);
        if (representationDocument) formData.append("representationDocument", representationDocument);
        if (seremiAuthorization) formData.append("seremiAuthorization", seremiAuthorization);
        if (sagAuthorization) formData.append("sagAuthorization", sagAuthorization);
        clinicPhotos.forEach((photo, index) => {
          formData.append(`clinicPhoto_${index}`, photo);
        });
        
        // Servicios: solo consultas presenciales para clínicas
        const clinicServices = ['consultas'];
        if (additionalModalities.includes('teleconsulta')) clinicServices.push('video-consultas');
        if (additionalModalities.includes('domicilio')) clinicServices.push('a-domicilio');
        formData.append("services", JSON.stringify(clinicServices));
      } else {
        // Datos de veterinario independiente
        // El nombre profesional se genera automáticamente en el backend como "Dr(a). [Nombre] [Apellido Paterno]"
        const autoProfessionalName = `Dr(a). ${firstName || ""} ${lastNameFather || ""}`.replace(/\s+/g, " ").trim();
        formData.append("professionalName", autoProfessionalName);
        // Para veterinario independiente, professionalRut DEBE ser igual a nationalId (se valida en el backend)
        formData.append("professionalRut", nationalId);
        // Para veterinario independiente, teléfono y email de contacto son los mismos de la cuenta
        formData.append("contactPhone", phoneNumber);
        formData.append("contactEmail", email);
        formData.append("serviceModalities", JSON.stringify(serviceModalities));
        formData.append("coverageCommunes", JSON.stringify(coverageCommunes));
        formData.append("specialties", JSON.stringify(specialties));
        formData.append("profileDescription", profileDescription || "");
        
        // Documentos de independiente
        formData.append("siiActivityStartDocument", siiActivityStartDocument);
        
        // Servicios: NO consultas presenciales para independientes
        const independentServices = [];
        if (serviceModalities.includes('teleconsulta')) independentServices.push('video-consultas');
        if (serviceModalities.includes('domicilio')) independentServices.push('a-domicilio');
        formData.append("services", JSON.stringify(independentServices));
      }

      const response = await axios.post(`${API_BASE}/api/vets/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const verificationStatus = response.data?.verificationStatus;
      const message =
        verificationStatus === "verified"
          ? "¡Registro exitoso! Validamos automáticamente tu perfil y ya puedes iniciar sesión."
          : "¡Registro enviado! Estamos validando tus credenciales y te avisaremos cuando finalice.";

      alert(message);
      navigate("/login/vet");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error en el registro. Por favor verifica todos los datos e intenta nuevamente.";
      setError(errorMessage);
      
      // Si el error es relacionado con el token, ir al paso 1 y permitir reintentar
      if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('código') || errorMessage.toLowerCase().includes('verificación')) {
        setIsTokenVerified(false);
        setTokenError("El código de verificación no es válido. Por favor verifica nuevamente.");
        setCurrentStep(1);
      }
      
      console.error("Error en registro:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center px-3 sm:px-4 py-6 md:py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-xl w-full max-w-2xl"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-2">
          {isClinic ? 'Registro de Clínica Veterinaria' : 'Registro de Veterinario Independiente'}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6 md:mb-8">
          {isClinic 
            ? 'Completa los datos de tu clínica para ofrecer consultas presenciales'
            : 'Validamos tu título, RUT chileno y reconocimiento facial para mantener la confianza de los tutores.'}
        </p>
        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {[1,2,3].map((i) => (
            <div key={i} className="flex-1 flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep>=i ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{i}</div>
              {i<3 && <div className={`h-1 flex-1 mx-2 rounded ${currentStep>i ? 'bg-violet-600' : 'bg-gray-200'}`}></div>}
            </div>
          ))}
        </div>

        {/* STEP 1 - Datos de la empresa (solo para clínicas) o Cuenta (para independientes) */}
        {currentStep === 1 && (
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {isClinic ? (
            <>
              {/* Paso 1 para Clínica: Datos de la empresa directamente */}
              <div className="md:col-span-2 border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Datos de la Clínica</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Información legal y de contacto</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  RUT de la clínica <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clinicRutFormatted}
                  onChange={(e) => {
                    const formatted = formatRut(e.target.value);
                    setClinicRutFormatted(formatted);
                    setClinicRut(normalizeRut(e.target.value));
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="12.345.678-9"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Razón social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="Nombre legal según SII"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Nombre de fantasía <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="Ej: Clínica VetGoNow Providencia"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Teléfono móvil clínica <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium">
                    +56
                  </span>
                  <input
                    type="text"
                    value={clinicMobileLocal}
                    onChange={(e) => {
                      const localDigits = sanitizeLocalPhone(e.target.value);
                      setClinicMobileLocal(formatLocalPhoneDisplay(localDigits));
                      setClinicMobile(localDigits ? `+56${localDigits}` : "");
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="9XXXXXXXX"
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Email de la clínica <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="clinica@email.com"
                    required
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!clinicEmail) {
                        setError("Por favor ingresa el correo de la clínica primero.");
                        return;
                      }
                      try {
                        await axios.post(`${API_BASE}/api/send-token/toemail`, { email: clinicEmail });
                        setEmail(clinicEmail); // Sincronizar para verificación
                        setError("");
                        alert("Código de verificación enviado al correo de la clínica.");
                      } catch (err) {
                        setError(err.response?.data?.message || "No se pudo enviar el código.");
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all whitespace-nowrap"
                  >
                    Obtener código
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Código de verificación <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={token}
                    onChange={(event) => {
                      if (isTokenVerified) return;
                      setToken(event.target.value);
                      setTokenError("");
                    }}
                    disabled={isTokenVerified || isVerifyingToken}
                    readOnly={isTokenVerified}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-black transition-all ${
                      isTokenVerified
                        ? "border-green-300 focus:ring-green-300 bg-green-50 cursor-not-allowed"
                        : tokenError 
                          ? "border-red-300 focus:ring-red-300" 
                          : "border-gray-200 focus:ring-blue-500"
                    } ${isVerifyingToken ? "opacity-60 cursor-wait" : ""}`}
                    placeholder="Ingresa el código que llegó al correo"
                    required
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token || !clinicEmail) return;
                      setIsVerifyingToken(true);
                      try {
                        const res = await axios.post(`${API_BASE}/api/send-token/verify-token`, {
                          email: clinicEmail,
                          token,
                        });
                        if (res.data?.success) {
                          setIsTokenVerified(true);
                          setTokenError("");
                          setEmail(clinicEmail); // Sincronizar
                        } else {
                          setIsTokenVerified(false);
                          setTokenError("Código inválido o expirado.");
                        }
                      } catch (err) {
                        setIsTokenVerified(false);
                        setTokenError(err.response?.data?.message || "Error al verificar el código.");
                      } finally {
                        setIsVerifyingToken(false);
                      }
                    }}
                    disabled={!token || !clinicEmail || isTokenVerified || isVerifyingToken}
                    className="bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 active:bg-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    {isVerifyingToken ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Verificando...</span>
                      </>
                    ) : isTokenVerified ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Verificado</span>
                      </>
                    ) : (
                      "Verificar"
                    )}
                  </button>
                </div>
                {isTokenVerified && (
                  <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    ¡Código verificado exitosamente!
                  </p>
                )}
                {tokenError && (
                  <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-xs flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{tokenError}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Sección de Dirección con Mapa */}
              <div className="md:col-span-2 border-t pt-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Dirección del establecimiento</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Ubica tu clínica en el mapa o busca la dirección</p>
                  </div>
                </div>
                
                {/* Buscador de dirección con Autocomplete */}
                {isMapLoaded && (
                  <div className="mb-4">
                    <Autocomplete
                      onLoad={(autocomplete) => {
                        autocompleteRef.current = autocomplete;
                        autocomplete.setComponentRestrictions({ country: 'cl' });
                        autocomplete.setFields(['address_components', 'geometry', 'formatted_address']);
                      }}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <input
                        type="text"
                        placeholder="Buscar dirección (ej: Av. Providencia 123, Providencia)"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all shadow-sm"
                      />
                    </Autocomplete>
                  </div>
                )}
                
                {/* Mapa */}
                {isMapLoaded ? (
                  <div className="mb-4 rounded-xl overflow-hidden shadow-lg border-2 border-gray-200" style={{ height: '400px' }}>
                    <GoogleMapWrapper
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={mapCenter}
                      zoom={clinicLocation.lat ? 16 : 12}
                      onClick={onMapClick}
                      options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                      }}
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                    >
                      {clinicLocation.lat && clinicLocation.lng && (
                        <Marker
                          position={{ lat: clinicLocation.lat, lng: clinicLocation.lng }}
                          draggable={true}
                          onDragEnd={(e) => {
                            if (e.latLng) {
                              const lat = e.latLng.lat();
                              const lng = e.latLng.lng();
                              setClinicLocation({ lat, lng });
                              setMapCenter({ lat, lng });
                              
                              // Geocodificación inversa
                              if (window.google && window.google.maps) {
                                const geocoder = new window.google.maps.Geocoder();
                                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                                  if (status === 'OK' && results[0]) {
                                    const place = results[0];
                                    const addressComponents = place.address_components || [];
                                    let street = "";
                                    let number = "";
                                    let commune = "";
                                    let region = "";
                                    
                                    addressComponents.forEach(component => {
                                      const types = component.types;
                                      if (types.includes('route')) street = component.long_name;
                                      if (types.includes('street_number')) number = component.long_name;
                                      if (types.includes('administrative_area_level_2') || types.includes('locality')) commune = component.long_name;
                                      if (types.includes('administrative_area_level_1')) region = component.long_name;
                                    });
                                    
                                    setClinicAddress(prev => ({
                                      ...prev,
                                      street: street || prev.street,
                                      number: number || prev.number,
                                      commune: commune || prev.commune,
                                      region: region || prev.region,
                                      reference: place.formatted_address || prev.reference
                                    }));
                                  }
                                });
                              }
                            }
                          }}
                        />
                      )}
                    </GoogleMapWrapper>
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center" style={{ height: '400px' }}>
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando mapa...</p>
                    </div>
                  </div>
                )}
                
                {/* Campos de dirección */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Dirección completa
                    </label>
                    <input
                      type="text"
                      value={clinicAddress.reference || `${clinicAddress.street} ${clinicAddress.number}, ${clinicAddress.commune}`}
                      readOnly
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Calle <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clinicAddress.street}
                      onChange={(e) => setClinicAddress({...clinicAddress, street: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clinicAddress.number}
                      onChange={(e) => setClinicAddress({...clinicAddress, number: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Comuna <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clinicAddress.commune}
                      onChange={(e) => setClinicAddress({...clinicAddress, commune: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Región <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clinicAddress.region}
                      onChange={(e) => setClinicAddress({...clinicAddress, region: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Cuenta de acceso (simplificado) */}
              <div className="md:col-span-2 border-t pt-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Cuenta de acceso</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Datos para iniciar sesión en la plataforma</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Nombre del administrador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="Nombre completo"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">Persona que administrará la cuenta</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  RUT del administrador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(event) => {
                    const v = formatRut(event.target.value);
                    setNationalId(v);
                    setRutError("");
                  }}
                  onBlur={() => {
                    if (!validateRut(nationalId)) {
                      setRutError("RUT chileno inválido");
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="12.345.678-9"
                  required
                />
                {rutError && <p className="text-xs text-red-600 mt-1.5">{rutError}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Teléfono del administrador <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium">
                    +56
                  </span>
                  <input
                    type="text"
                    value={phoneLocal}
                    onChange={(e) => {
                      const localDigits = sanitizeLocalPhone(e.target.value);
                      setPhoneLocal(formatLocalPhoneDisplay(localDigits));
                      setPhoneNumber(localDigits ? `+56${localDigits}` : "");
                      setPhoneError("");
                    }}
                    onBlur={() => {
                      const digits = sanitizeLocalPhone(phoneLocal);
                      const fullNumber = digits ? `+56${digits}` : "";
                      if (fullNumber && !validatePhoneCl(fullNumber)) {
                        setPhoneError("Teléfono inválido. Formato esperado: +569XXXXXXXX");
                      } else {
                        setPhoneError("");
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="9XXXXXXXX"
                    inputMode="numeric"
                    required
                  />
                </div>
                {phoneError && <p className="text-xs text-red-600 mt-1.5">{phoneError}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="Vuelve a ingresar tu contraseña"
                  required
                />
              </div>
            </>
          ) : (
            <>
              {/* Paso 1 para Veterinario Independiente: Cuenta (mantener como está) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="Ej: Valentina Andrea"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Apellido paterno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastNameFather}
                  onChange={(event) => setLastNameFather(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="Ej: Rojas"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Apellido materno (opcional)</label>
                <input
                  type="text"
                  value={lastNameMother}
                  onChange={(event) => setLastNameMother(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="Ej: González"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                    placeholder="tu@email.com"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendToken}
                    className="bg-violet-600 text-white px-4 py-2.5 rounded-lg hover:bg-violet-700 active:bg-violet-800 transition-all"
                  >
                    Obtener código
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Código de verificación <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={token}
                    onChange={(event) => {
                      if (isTokenVerified) return;
                      setToken(event.target.value);
                      setTokenError("");
                    }}
                    disabled={isTokenVerified || isVerifyingToken}
                    readOnly={isTokenVerified}
                    className={`flex-1 px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-black ${
                      isTokenVerified
                        ? "border-green-300 focus:ring-green-300 bg-green-50 cursor-not-allowed"
                        : tokenError 
                          ? "border-red-300 focus:ring-red-300" 
                          : "border-gray-300 focus:ring-violet-300"
                    } ${isVerifyingToken ? "opacity-60 cursor-wait" : ""}`}
                    placeholder="Ingresa el código que llegó a tu correo"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVerifyToken}
                    disabled={!token || !email || isTokenVerified || isVerifyingToken}
                    className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 active:bg-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
                  >
                    {isVerifyingToken ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Verificando...</span>
                      </>
                    ) : isTokenVerified ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Verificado</span>
                      </>
                    ) : (
                      "Verificar"
                    )}
                  </button>
                </div>
                {isTokenVerified && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    ¡Código verificado exitosamente!
                  </p>
                )}
                {tokenError && (
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-xs flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{tokenError}</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleSendToken}
                      className="text-red-700 text-xs mt-1 underline hover:text-red-800"
                    >
                      Solicitar un nuevo código
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  RUT chileno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(event) => {
                    const v = formatRut(event.target.value);
                    setNationalId(v);
                    setRutError("");
                  }}
                  onBlur={() => {
                    if (!validateRut(nationalId)) {
                      setRutError("RUT chileno inválido");
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="12.345.678-9"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se formatea automáticamente como 12.345.678-9 y valida dígito verificador.
                </p>
                {rutError && <p className="text-xs text-red-600 mt-1">{rutError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm">
                    +56
                  </span>
                  <input
                    type="text"
                    value={phoneLocal}
                    onChange={(e) => {
                      const localDigits = sanitizeLocalPhone(e.target.value);
                      setPhoneLocal(formatLocalPhoneDisplay(localDigits));
                      setPhoneNumber(localDigits ? `+56${localDigits}` : "");
                      setPhoneError("");
                    }}
                    onBlur={() => {
                      const digits = sanitizeLocalPhone(phoneLocal);
                      const fullNumber = digits ? `+56${digits}` : "";
                      if (fullNumber && !validatePhoneCl(fullNumber)) {
                        setPhoneError("Teléfono inválido. Formato esperado: +569XXXXXXXX");
                      } else {
                        setPhoneError("");
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                    placeholder="9XXXXXXXX"
                    inputMode="numeric"
                    required
                  />
                </div>
                {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="Ingresa tu contraseña"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="Vuelve a ingresar tu contraseña"
                  required
                />
              </div>
            </>
          )}
        </div>
        )}

        {/* STEP 2 - Responsable técnico (solo para clínicas) o Tipo y servicios (para independientes) */}
        {currentStep === 2 && (
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {isClinic ? (
            <>
              {/* Paso 2 para Clínica: Responsable técnico */}
              <div className="md:col-span-2 border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Responsable técnico</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Veterinario responsable técnico de la clínica</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Nombre responsable técnico <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={technicalResponsible.name}
                  onChange={(e) => setTechnicalResponsible({...technicalResponsible, name: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="Nombre completo del veterinario"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  RUT responsable técnico <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formatRut(technicalResponsible.rut)}
                  onChange={(e) => {
                    const normalized = normalizeRut(e.target.value);
                    setTechnicalResponsible({...technicalResponsible, rut: normalized});
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="12.345.678-9"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Email responsable técnico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={technicalResponsible.email}
                  onChange={(e) => setTechnicalResponsible({...technicalResponsible, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  placeholder="responsable@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Teléfono responsable técnico</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium">
                    +56
                  </span>
                  <input
                    type="text"
                    value={technicalResponsiblePhoneLocal}
                    onChange={(e) => {
                      const localDigits = sanitizeLocalPhone(e.target.value);
                      const formatted = formatLocalPhoneDisplay(localDigits);
                      setTechnicalResponsiblePhoneLocal(formatted);
                      setTechnicalResponsible({...technicalResponsible, phone: localDigits ? `+56${localDigits}` : ""});
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                    placeholder="9XXXXXXXX"
                    inputMode="numeric"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Teléfono de contacto del responsable (opcional)</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Rol del usuario que se registra <span className="text-red-500">*</span>
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all bg-white"
                  required
                >
                  <option value="">Selecciona tu rol...</option>
                  <option value="representante_legal">Representante legal</option>
                  <option value="administrador_autorizado">Administrador autorizado</option>
                </select>
              </div>
              <div className="md:col-span-2 border-t pt-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Servicios que ofrece la clínica</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Selecciona los servicios disponibles</p>
                  </div>
                </div>
                <div className="space-y-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={supportsInPersonEmergency}
                      onChange={(e) => setSupportsInPersonEmergency(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Urgencias presenciales</span>
                      <p className="text-xs text-gray-500">Atención de urgencias en la clínica (en el momento)</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={additionalModalities.includes('domicilio')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAdditionalModalities([...additionalModalities, 'domicilio']);
                        } else {
                          setAdditionalModalities(additionalModalities.filter(m => m !== 'domicilio'));
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Atención a domicilio</span>
                      <p className="text-xs text-gray-500">Visitas a domicilio con agenda previa</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={supportsEmergency === true}
                      onChange={(e) => setSupportsEmergency(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Urgencias a domicilio</span>
                      <p className="text-xs text-gray-500">Atención de urgencias en el domicilio del tutor (en el momento)</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={additionalModalities.includes('teleconsulta')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAdditionalModalities([...additionalModalities, 'teleconsulta']);
                        } else {
                          setAdditionalModalities(additionalModalities.filter(m => m !== 'teleconsulta'));
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Teleconsulta</span>
                      <p className="text-xs text-gray-500">Consultas veterinarias por videollamada</p>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  <strong>Nota:</strong> Las clínicas siempre ofrecen atención presencial con agenda. Los servicios adicionales son opcionales.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Paso 2 para Veterinario Independiente: Tipo y servicios */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Modalidades de atención</label>
                <div className="flex flex-col gap-2 text-sm md:text-base">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceModalities.includes('domicilio')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setServiceModalities([...serviceModalities, 'domicilio']);
                        } else {
                          setServiceModalities(serviceModalities.filter(m => m !== 'domicilio'));
                          setCoverageCommunes([]);
                        }
                      }}
                      className="w-4 h-4 text-violet-600 rounded"
                    />
                    Atención a domicilio
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceModalities.includes('teleconsulta')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setServiceModalities([...serviceModalities, 'teleconsulta']);
                        } else {
                          setServiceModalities(serviceModalities.filter(m => m !== 'teleconsulta'));
                        }
                      }}
                      className="w-4 h-4 text-violet-600 rounded"
                    />
                    Teleconsulta
                  </label>
                </div>
              </div>
              {serviceModalities.includes('domicilio') && (
                <div className="mt-4 p-4 bg-violet-50 rounded-lg">
                  <label className="block text-sm font-medium mb-2">
                    Comunas de cobertura <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Chips de comunas seleccionadas */}
                  {coverageCommunes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {coverageCommunes.map((commune) => (
                        <span
                          key={commune}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm rounded-full font-medium"
                        >
                          {commune}
                          <button
                            type="button"
                            onClick={() => {
                              if (commune === "Toda la Región Metropolitana") {
                                setCoverageCommunes([]);
                              } else {
                                setCoverageCommunes(coverageCommunes.filter(c => c !== commune));
                              }
                            }}
                            className="ml-1 hover:bg-violet-700 rounded-full p-0.5 transition-colors"
                            aria-label={`Eliminar ${commune}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
              ))}
            </div>
                  )}

                  {/* Select dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCommuneDropdownOpen(!isCommuneDropdownOpen)}
                      className="w-full px-3 py-2.5 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 flex items-center justify-between text-black"
                    >
                      <span className={coverageCommunes.length === 0 ? "text-gray-500" : "text-black"}>
                        {coverageCommunes.length === 0 
                          ? "Selecciona las comunas donde trabajas..." 
                          : coverageCommunes.includes("Toda la Región Metropolitana")
                            ? "Toda la Región Metropolitana"
                            : `${coverageCommunes.length} comuna${coverageCommunes.length > 1 ? 's' : ''} seleccionada${coverageCommunes.length > 1 ? 's' : ''}`
                        }
                      </span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isCommuneDropdownOpen ? 'transform rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isCommuneDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {/* Opción "Toda la RM" */}
                        <button
                          type="button"
                          onClick={() => {
                            setCoverageCommunes(["Toda la Región Metropolitana"]);
                            setIsCommuneDropdownOpen(false);
                            setCommuneSearchTerm("");
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center justify-between ${
                            coverageCommunes.includes("Toda la Región Metropolitana") ? "bg-violet-100 font-semibold" : ""
                          }`}
                        >
                          <span className="text-violet-700 font-medium">🌐 Toda la Región Metropolitana</span>
                          {coverageCommunes.includes("Toda la Región Metropolitana") && (
                            <svg className="w-5 h-5 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        
                        <div className="border-t border-gray-200"></div>
                        
                        {/* Buscador */}
                        <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                          <input
                            type="text"
                            placeholder="Buscar comuna..."
                            value={communeSearchTerm}
                            onChange={(e) => setCommuneSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black text-sm"
                          />
          </div>

                        {/* Lista de comunas */}
                        <div className="max-h-48 overflow-y-auto">
                          {COMUNAS_RM.filter(comuna => 
                            comuna.toLowerCase().includes(communeSearchTerm.toLowerCase())
                          ).map((comuna) => {
                            const isSelected = coverageCommunes.includes(comuna);
                            return (
                              <button
                                key={comuna}
                                type="button"
                                onClick={() => {
                                  if (coverageCommunes.includes("Toda la Región Metropolitana")) {
                                    // Si "Toda la RM" está seleccionada, reemplazarla
                                    setCoverageCommunes([comuna]);
                                  } else if (isSelected) {
                                    setCoverageCommunes(coverageCommunes.filter(c => c !== comuna));
                                  } else {
                                    setCoverageCommunes([...coverageCommunes, comuna]);
                                  }
                                }}
                                className={`w-full px-4 py-2 text-left hover:bg-violet-50 transition-colors flex items-center justify-between ${
                                  isSelected ? "bg-violet-100 font-semibold" : ""
                                }`}
                              >
                                <span>{comuna}</span>
                                {isSelected && (
                                  <svg className="w-5 h-5 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cerrar dropdown al hacer click fuera */}
                  {isCommuneDropdownOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => {
                        setIsCommuneDropdownOpen(false);
                        setCommuneSearchTerm("");
                      }}
                    ></div>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Foto de perfil (opcional)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(event) => setProfileImage(event.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
          </div>

          {/* Campos específicos para veterinario independiente */}
          {!isClinic && (
            <>
              <div className="md:col-span-2 border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-violet-700">Datos de Contacto Profesional</h3>
              </div>
              <div className="md:col-span-2">
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <p className="text-sm text-violet-800">
                    <strong>Nota:</strong> Tu nombre profesional se generará automáticamente como "Dr(a). [Nombre] [Apellido Paterno]". Tu teléfono y email de contacto profesional serán los mismos que registraste en el Paso 1 (tu cuenta).
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Especialidades (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Felinos, Exóticos, Cirugía (separadas por comas)"
                  value={specialties.join(', ')}
                  onChange={(e) => {
                    const specs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setSpecialties(specs);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción del perfil (opcional)</label>
                <textarea
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-black"
                  placeholder="Breve descripción sobre tu experiencia y servicios..."
                />
              </div>
            </>
          )}

        </div>
        )}

        {/* STEP 3 - Documentos y Selfie */}
        {currentStep === 3 && (
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2 border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">{isClinic ? 'Documentos de la Clínica' : 'Documentos del Veterinario'}</h3>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Título o acreditación veterinaria <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setCertificateFile(event.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cédula de identidad chilena <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) =>
                setNationalIdDocument(event.target.files?.[0] || null)
              }
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Sube una fotografía clara de ambos lados o un escaneo en PDF para validar tu identidad.
            </p>
          </div>

          {/* Documentos específicos para veterinario independiente */}
          {!isClinic && (
            <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
                Inicio de actividades SII <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setSiiActivityStartDocument(event.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
                Certificado o captura donde se vea RUT y giro como servicio veterinario
            </p>
          </div>
          )}

          {/* Documentos específicos para clínica */}
          {isClinic && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Patente municipal de clínica <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setMunicipalLicenseDocument(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Patente donde se vea dirección y giro acorde a clínica veterinaria
                </p>
        </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Título del responsable técnico <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setTechnicalResponsibleTitleDocument(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Documento de representación (opcional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setRepresentationDocument(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Poder, vigencia de sociedad, etc.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Autorización SEREMI (opcional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setSeremiAuthorization(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si ofrece imagenología con radiación ionizante
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Autorización SAG (opcional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setSagAuthorization(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si tiene expendio de medicamentos veterinarios
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Fotos de la clínica (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    setClinicPhotos(files);
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fachada, salas, pabellón
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Verificación de identidad <span className="text-gray-400 text-xs">(Opcional - temporalmente deshabilitada)</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsIDVerificationOpen(true)}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                disabled
              >
                Iniciar verificación
              </button>
              {idVerificationData && (
                <span className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                  ✓ Verificación completada ({idVerificationData.verificationData?.similarity}% similitud)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              La verificación de identidad está temporalmente deshabilitada. Podrás completarla más adelante.
            </p>
          </div>

          {isIDVerificationOpen && (
            <IDVerificationModalHuman
              open={isIDVerificationOpen}
              onClose={() => setIsIDVerificationOpen(false)}
              onComplete={(data) => {
                setIdVerificationData(data);
                setIsIDVerificationOpen(false);
              }}
              nationalId={nationalId}
            />
          )}
        </div>
        )}

        {/* Declaraciones y aceptación */}
        <div className="mt-6 md:mt-8 border-t pt-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Declaraciones y aceptación</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declarations.acceptedTerms}
                onChange={(e) => setDeclarations({...declarations, acceptedTerms: e.target.checked})}
                className="mt-1 w-4 h-4 text-violet-600 rounded"
                required
              />
              <span className="text-sm">
                Acepto los <a href="/terms" target="_blank" className="text-violet-600 hover:underline">Términos y Condiciones</a> de VetGoNow <span className="text-red-500">*</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declarations.acceptedPrivacy}
                onChange={(e) => setDeclarations({...declarations, acceptedPrivacy: e.target.checked})}
                className="mt-1 w-4 h-4 text-violet-600 rounded"
                required
              />
              <span className="text-sm">
                Acepto la <a href="/privacy" target="_blank" className="text-violet-600 hover:underline">Política de Privacidad</a> <span className="text-red-500">*</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declarations.informationIsTruthful}
                onChange={(e) => setDeclarations({...declarations, informationIsTruthful: e.target.checked})}
                className="mt-1 w-4 h-4 text-violet-600 rounded"
                required
              />
              <span className="text-sm">
                Declaro que la información y documentos son veraces <span className="text-red-500">*</span>
              </span>
            </label>
            {isClinic && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarations.hasAuthorization}
                  onChange={(e) => setDeclarations({...declarations, hasAuthorization: e.target.checked})}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                  required
                />
                <span className="text-sm">
                  Declaro que tengo autorización para registrar esta clínica <span className="text-red-500">*</span>
                </span>
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </p>
          </div>
        )}

        <div className={`space-y-4 ${error ? 'mt-0' : 'mt-6 md:mt-8'}`}>
          {currentStep < 3 ? (
            <div className="flex items-center justify-between gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setError(""); // Limpiar errores al volver atrás
                  goBack();
                }} 
                disabled={currentStep===1} 
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => {
                  // Permitir avanzar sin validación completa (solo para navegación)
                  // La validación completa se hará al finalizar el registro
                  setError(""); // Limpiar errores al avanzar
                  goNext();
                }}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
              >
                Continuar
              </button>
            </div>
          ) : (
          <button
            type="submit"
            disabled={loading}
              className={`w-full ${isClinic ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' : 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800'} text-white px-4 py-3 md:py-3.5 rounded-xl font-medium text-sm md:text-base disabled:opacity-60 transition-all active:scale-[0.97]`}
            >
              {loading 
                ? "Procesando registro..." 
                : isClinic 
                  ? "Completar registro de clínica" 
                  : "Completar registro de veterinario independiente"}
          </button>
          )}

          <p className="text-center text-xs md:text-sm text-gray-600">
            ¿Ya tienes una cuenta profesional?{" "}
            <button
              type="button"
              onClick={() => navigate("/login/vet")}
              className="text-violet-700 hover:underline font-medium"
            >
              Inicia sesión
            </button>
          </p>

          <p className="text-center text-xs text-gray-500">
            VetGoNow verificará tu información con registros oficiales chilenos y el Colegio Médico
            Veterinario para garantizar la seguridad de los tutores.
          </p>
        </div>
      </form>
    </div>
  );
};

export default VetRegisterPage;

