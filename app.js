// --- Configuración y arranque ---
let client;
let userSession = null;
const app = document.getElementById('app');

const supabaseUrl = 'https://gcdtrethbykjsaxkxfgg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZHRyZXRoYnlranNheGt4ZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTY0NzEsImV4cCI6MjA4NzY5MjQ3MX0.ZnJUdrwU5OhfVUmdcrD1TUCJZYTnVlNVprNfU19NPaA';

async function init() {
    try {
        // Verificar que Supabase esté cargado (desde el CDN)
        if (typeof supabase === 'undefined') {
            setTimeout(init, 100); // Reintentar si el CDN no ha cargado
            return;
        }

        client = supabase.createClient(supabaseUrl, supabaseAnonKey);

        // Obtener sesión inicial
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;

        userSession = session;

        if (userSession) ensureProfileExists(userSession.user);

        // Escuchar cambios de auth
        client.auth.onAuthStateChange((_event, session) => {
            userSession = session;
            if (userSession) ensureProfileExists(userSession.user);
            render();
        });

        render();
    } catch (err) {
        console.error("Error de inicialización:", err);
        app.innerHTML = `<div class="auth-container"><div class="card" style="color:red">Error: No se pudo conectar con Supabase. Revisa tu conexión.</div></div>`;
    }
}

async function ensureProfileExists(user) {
    try {
        const { data: profile, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(); // maybeSingle no lanza error si no hay filas

        if (error) {
            console.error("Error al buscar perfil:", error);
            return;
        }

        if (!profile) {
            console.log("Creando perfil faltante para:", user.email);
            const { error: insertError } = await client.from('profiles').insert([
                {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'Estudiante',
                    username: user.email.split('@')[0]
                }
            ]);

            if (insertError) {
                console.error("Error al insertar perfil:", insertError);
                if (insertError.code === '42501') {
                    console.warn("RLS block: Asegúrate de ejecutar el nuevo SQL para permitir INSERT en profiles.");
                }
            } else {
                render(); // Recargar para mostrar el contenido ahora que el perfil existe
            }
        }
    } catch (err) {
        console.error("Excepción en ensureProfileExists:", err);
    }
}

// --- Renderizado Principal ---
function render() {
    if (!userSession) {
        renderLogin();
    } else {
        renderHome();
    }
}

// --- Vistas ---

function renderLogin() {
    app.innerHTML = `
        <div class="auth-container">
            <div class="card animate-fade">
                <div class="logo">Estudiantil</div>
                <form id="login-form">
                    <div class="input-group">
                        <label>Email Estudiantil</label>
                        <input type="email" id="login-email" class="input" placeholder="tu@universidad.edu" required>
                    </div>
                    <div class="input-group">
                        <label>Contraseña</label>
                        <input type="password" id="login-password" class="input" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary" id="btn-login-submit">Entrar</button>
                </form>
                <p style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem;">
                    ¿No tienes cuenta? <a href="#" id="show-register" style="color: #6c5ce7; font-weight: 700;">Regístrate</a>
                </p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('btn-login-submit');

        btn.disabled = true;
        btn.innerText = 'Entrando...';

        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Error: " + error.message);
            btn.disabled = false;
            btn.innerText = 'Entrar';
        }
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        renderRegister();
    });
}

function renderRegister() {
    app.innerHTML = `
        <div class="auth-container">
            <div class="card animate-fade">
                <div class="logo">Únete</div>
                <form id="register-form">
                    <div class="input-group">
                        <label>Nombre Completo</label>
                        <input type="text" id="reg-name" class="input" placeholder="Ej. Juan Pérez" required>
                    </div>
                    <div class="input-group">
                        <label>Email Estudiantil</label>
                        <input type="email" id="reg-email" class="input" placeholder="tu@universidad.edu" required>
                    </div>
                    <div class="input-group">
                        <label>Contraseña</label>
                        <input type="password" id="reg-password" class="input" placeholder="Mínimo 6 caracteres" required>
                    </div>
                    <button type="submit" class="btn btn-secondary" id="btn-reg-submit">Crear Cuenta</button>
                </form>
                <p style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem;">
                    ¿Ya tienes cuenta? <a href="#" id="show-login" style="color: #6c5ce7; font-weight: 700;">Inicia sesión</a>
                </p>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const btn = document.getElementById('btn-reg-submit');

        btn.disabled = true;
        btn.innerText = 'Creando...';

        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            alert("Error: " + error.message);
            btn.disabled = false;
            btn.innerText = 'Crear Cuenta';
        } else {
            alert('¡Registro exitoso! Revisa tu email para confirmar (si está activado) o ya puedes iniciar sesión.');
            renderLogin();
        }
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        renderLogin();
    });
}

async function renderHome() {
    app.innerHTML = `
        <nav class="navbar">
            <div class="nav-logo">Estudiantil</div>
            <div class="nav-actions">
                <button class="btn btn-primary nav-btn" id="btn-new-post">+ Foto</button>
                <button class="btn btn-secondary nav-btn" id="btn-logout">Salir</button>
            </div>
        </nav>
        <main class="feed-container" id="feed-container">
            <div style="text-align: center; padding: 3rem;">Cargando novedades...</div>
        </main>
    `;

    document.getElementById('btn-logout').onclick = () => client.auth.signOut();
    document.getElementById('btn-new-post').onclick = showUploadModal;

    loadPosts();
}

async function loadPosts() {
    const container = document.getElementById('feed-container');
    console.log("Cargando posts...");

    const { data: posts, error } = await client
        .from('posts')
        .select(`
            *,
            profiles(full_name, avatar_url, username),
            likes(user_id),
            comments(id)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error en select posts:", error);
        container.innerHTML = `
            <div class="card" style="text-align: center; border: 2px dashed #ff7675;">
                <p style="color:#ff7675; font-weight:bold;">Error al obtener publicaciones</p>
                <p style="font-size:0.8rem; color:var(--text-gray)">${error.message}</p>
                <button class="btn btn-primary" onclick="loadPosts()" style="margin-top:1rem; width:auto; padding: 0.5rem 1rem;">Reintentar</button>
            </div>
        `;
        return;
    }

    if (posts.length === 0) {
        container.innerHTML = `<div class="card" style="text-align: center; max-width: 100%;">
            <p>Aún no hay publicaciones. ¡Sé el primero en compartir algo!</p>
        </div>`;
        return;
    }

    container.innerHTML = ''; // Clear existing content
    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post animate-fade';
        const isOwner = userSession && userSession.user.id === post.user_id;
        const isLiked = post.likes?.some(l => l.user_id === userSession.user.id);

        card.innerHTML = `
            <div class="post-header">
                <div class="post-user">
                    <img src="${post.profiles?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + (post.profiles?.username || 'user')}" class="avatar" alt="User">
                    <div class="post-info">
                        <h4>${post.profiles?.full_name || 'Estudiante'}</h4>
                        <span>${new Date(post.created_at).toLocaleDateString()} @${post.profiles?.username || ''}</span>
                    </div>
                </div>
                ${isOwner ? `
                <div class="post-menu">
                    <button class="menu-trigger" onclick="toggleMenu('${post.id}')">•••</button>
                    <div id="menu-${post.id}" class="menu-dropdown">
                        <button class="menu-item delete" onclick="deletePost('${post.id}', '${post.image_url}')">Eliminar</button>
                    </div>
                </div>
                ` : ''}
            </div>
            <img src="${post.image_url}" class="post-image" alt="Post">
            <div class="post-footer">
                <p class="post-desc">${post.description || ''}</p>
                <div class="post-actions">
                    <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        <span class="icon">❤️</span> ${post.likes?.length || 0}
                    </button>
                    <button class="action-btn" onclick="toggleComments('${post.id}')">
                        <span class="icon">💬</span> ${post.comments?.length || 0}
                    </button>
                </div>
                <div id="comments-${post.id}" class="comments-section" style="display:none">
                    <div id="comments-list-${post.id}"></div>
                    <div class="comment-input-area">
                        <input type="text" id="input-comm-${post.id}" class="input" placeholder="Escribe un comentario...">
                        <button class="btn btn-primary" onclick="postComment('${post.id}')">Publicar</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Acciones de Feed ---

function toggleMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    // Cerrar otros menús abiertos
    document.querySelectorAll('.menu-dropdown').forEach(m => {
        if (m.id !== `menu-${postId}`) m.classList.remove('show');
    });
    menu.classList.toggle('show');
}

// Cerrar menús al hacer clic fuera
window.onclick = function (event) {
    if (!event.target.matches('.menu-trigger')) {
        document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('show'));
    }
}

async function deletePost(postId, imageUrl) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;

    try {
        // 1. Obtener el nombre del archivo de la URL
        // La URL suele ser: .../storage/v1/object/public/post-images/nombre-archivo
        // Necesitamos extraer 'nombre-archivo'
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1]; // Get the last part after the last slash

        // 2. Eliminar de Storage
        const { error: storageError } = await client
            .storage
            .from('post-images')
            .remove([fileName]);

        if (storageError) console.warn("Error borrando imagen (podría no existir o permisos):", storageError);

        // 3. Eliminar de Database
        const { error: dbError } = await client
            .from('posts')
            .delete()
            .eq('id', postId);

        if (dbError) throw dbError;

        alert('Publicación eliminada correctamente.');
        loadPosts();
    } catch (err) {
        console.error("Error al eliminar:", err);
        alert("No se pudo eliminar: " + err.message);
    }
}

window.toggleLike = async (postId) => {
    const { data: existing } = await client.from('likes')
        .select('*')
        .eq('user_id', userSession.user.id)
        .eq('post_id', postId)
        .single();

    if (existing) {
        await client.from('likes').delete().eq('id', existing.id);
    } else {
        await client.from('likes').insert([{ user_id: userSession.user.id, post_id: postId }]);
    }
    loadPosts();
};

window.toggleComments = (postId) => {
    const el = document.getElementById(`comments-${postId}`);
    if (el.style.display === 'none') {
        el.style.display = 'block';
        loadComments(postId);
    } else {
        el.style.display = 'none';
    }
};

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    const { data: comments } = await client.from('comments')
        .select('*, profiles(full_name, username)')
        .eq('post_id', postId);

    if (!comments) return;

    list.innerHTML = comments.map(c => `
        <div style="font-size: 0.85rem; margin-bottom: 0.4rem;">
            <strong>${c.profiles?.full_name || c.profiles?.username || 'Usuario'}:</strong> ${c.content}
        </div>
    `).join('');
}

window.postComment = async (postId) => {
    const input = document.getElementById(`input-comm-${postId}`);
    if (!input.value.trim()) return;

    await client.from('comments').insert([{
        user_id: userSession.user.id,
        post_id: postId,
        content: input.value
    }]);
    input.value = '';
    loadComments(postId);
    loadPosts(); // Actualizar contador
};

// --- Modal de Subida ---

function showUploadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="card animate-fade">
            <h3 style="margin-bottom: 1.5rem;">Nueva Publicación</h3>
            <div class="input-group">
                <label>Elegir Imagen</label>
                <input type="file" id="file-post" class="input" accept="image/*">
            </div>
            <div class="input-group">
                <label>Descripción</label>
                <textarea id="desc-post" class="input" style="height: 80px; resize: none;"></textarea>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-secondary" id="btn-modal-cancel">Cancelar</button>
                <button class="btn btn-primary" id="btn-upload-submit">Publicar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-modal-cancel').onclick = () => overlay.remove();

    document.getElementById('btn-upload-submit').onclick = async () => {
        const file = document.getElementById('file-post').files[0];
        const desc = document.getElementById('desc-post').value;
        if (!file) { alert('Selecciona una imagen'); return; }

        const btn = document.getElementById('btn-upload-submit');
        btn.innerText = 'Subiendo...';
        btn.disabled = true;

        try {
            const fileName = `${userSession.user.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await client.storage
                .from('post-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = client.storage
                .from('post-images')
                .getPublicUrl(fileName);

            await client.from('posts').insert([{
                user_id: userSession.user.id,
                image_url: publicUrl,
                description: desc
            }]);

            overlay.remove();
            loadPosts();
        } catch (err) {
            alert("Error al subir: " + err.message);
            btn.innerText = 'Publicar';
            btn.disabled = false;
        }
    };
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', init);
