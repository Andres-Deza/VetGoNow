describe('Login y Registro', () => {
  it('debería permitir login con credenciales válidas', () => {
    cy.visit('/login');
    cy.get('#email').type('juan.1@VetGestion.com');
    cy.get('#password').type('usuario1pass');
  cy.get('#user-role').click();
    cy.get('button[type=submit]').click();
  cy.url().should('include', '/user-dashboard');
    cy.contains('Juan Pérez');
  });
  
  it('login exitoso con usuario del seed', () => {
    cy.visit('/login');
    cy.get('#email').type('juan.1@VetGestion.com');
    cy.get('#password').type('usuario1pass');
  cy.get('#user-role').click();
    cy.get('button[type=submit]').click();
  cy.url().should('include', '/user-dashboard');
  it('login exitoso con veterinario del seed', () => {
    cy.visit('/login');
    cy.get('#email').type('vet1@VetGestion.com');
    cy.get('#password').type('vet1pass');
    cy.get('#vet-role').click();
    cy.get('button[type=submit]').click();
    cy.url().should('include', '/vet-dashboard');
    cy.contains('Dr. Veterinario 1');
  });
    cy.contains('Juan Pérez');
  });
  
  it('login fallido con contraseña incorrecta', () => {
    cy.visit('/login');
    cy.get('#email').type('juan.1@VetGestion.com');
    cy.get('#password').type('wrongpass');
  cy.get('#user-role').click();
    cy.get('button[type=submit]').click();
  cy.contains('Correo o contraseña inválidos');
  });
  
  it('registro de nuevo usuario', () => {
    cy.visit('/register');
    cy.get('#name').type('Test User');
    cy.get('#email').type('test.user@VetGestion.com');
    cy.get('#phoneNumber').type('911229999');
    cy.get('#label-usuario').click();
    cy.get('#password').type('testpass123');
    cy.get('#confirmPassword').type('testpass123');
    // Simular verificación de token si el flujo lo requiere
    // cy.get('#token').type('123456'); // Descomenta si existe el input de token
    cy.get('button[type=submit]').click({force: true});
    cy.url().should('include', '/login');
    cy.contains('Iniciar sesión');
  });

    it('registro de nuevo veterinario', () => {
      cy.visit('/register');
      cy.get('#name').type('Test Vet');
      cy.get('#email').type('test.vet@VetGestion.com');
      cy.get('#phoneNumber').type('911229998');
      cy.get('#label-veterinario').click();
      cy.get('#password').type('testvetpass123');
      cy.get('#confirmPassword').type('testvetpass123');
      cy.get('button[type=submit]').click({force: true});
      cy.url().should('include', '/login');
      cy.contains('Iniciar sesión');
    });
  
  it('debería mostrar error con credenciales inválidas', () => {
    cy.visit('/login');
    cy.get('#email').type('juan.1@VetGestion.com');
    cy.get('#password').type('wrongpass');
  cy.get('#user-role').click();
    cy.get('button[type=submit]').click();
  cy.contains('Correo o contraseña inválidos');
  });
});