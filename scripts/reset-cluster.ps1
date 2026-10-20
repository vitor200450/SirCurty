# =============================================================================
# scripts/reset-cluster.ps1
# Reconstrói o cluster local do Sir Curty do zero (Docker Desktop + Kubernetes).
#
# Uso:
#   pwsh -File scripts/reset-cluster.ps1
#   pwsh -File scripts/reset-cluster.ps1 -GoogleClientId "SEU_ID.apps.googleusercontent.com"
#
# O que faz (automatizado):
#   1. Verifica pré-requisitos (kubectl, helm, Docker Desktop, K8s habilitado).
#   2. Instala ingress-nginx se não estiver presente.
#   3. Aplica o Helm chart k8s/charts/sircurty (api, frontend, postgres,
#      observabilidade, ingress, dashboards).
#   4. Cria/atualiza o Secret sircurty-secrets (POSTGRES_PASSWORD, DATABASE_URL,
#      JWT_SECRET, GOOGLE_CLIENT_ID).
#   5. Instala o ArgoCD (se não estiver instalado) e aplica o Application
#      k8s/argocd/application.yaml.
#   6. Aguarda todos os pods ficarem prontos.
#   7. Valida /health/ready e um redirect pelo ingress.
#
# O que NÃO dá para automatizar (passos manuais marcados com [MANUAL]):
#   [MANUAL] Habilitar o Kubernetes no Docker Desktop (configurações → Kubernetes → Enable).
#   [MANUAL] Escrever C:\Windows\System32\drivers\etc\hosts com direitos de admin:
#            127.0.0.1 sircurty.local grafana.sircurty.local otel.sircurty.local
#   [MANUAL] O GOOGLE_CLIENT_ID real precisa estar no .env (gitignorado) ou ser
#            passado por -GoogleClientId. Sem ele a API não sobe.
#
# Idempotente: pode rodar quantas vezes quiser, não destrói dados do Postgres.
# =============================================================================

[CmdletBinding()]
param(
    # Google Client ID real (do .env local). Se omitir, tenta ler do .env na raiz.
    [string]$GoogleClientId,

    # Tag de imagem a usar no helm (padrão: o que está em values.yaml, que é o SHA do GHCR)
    [string]$ImageTag,

    # Namespace onde o release Helm fica (o chart cria sircurty e observability)
    [string]$HelmNamespace = "default",

    # Nome do release Helm
    [string]$ReleaseName = "sircurty",

    # Caminho raiz do repo (padrão: onde este script está, um nível acima de scripts/)
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

# Gerador de senha compatível com PowerShell Core (pwsh)
function New-RandomPassword([int]$Length = 24) {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+"
    $pwd = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $pwd += $chars[Get-Random -Minimum 0 -Maximum $chars.Length]
    }
    return $pwd
}

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Sir Curty - reset do cluster local (Docker Desktop)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 0. Pré-requisitos
# ---------------------------------------------------------------------------
function Test-Command($cmd) {
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

$missing = @()
if (-not (Test-Command kubectl)) { $missing += "kubectl" }
if (-not (Test-Command helm))   { $missing += "helm" }
if ($missing.Count -gt 0) {
    Write-Host "FALTANDO no PATH: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Instale: https://kubernetes.io/docs/tasks/tools/ e https://helm.sh/docs/intro/install/" -ForegroundColor Yellow
    exit 1
}

# Verifica se o Kubernetes do Docker Desktop está respondendo
try {
    $ready = kubectl get --raw /readyz 2>$null
    if ($ready -ne "ok") { throw "readyz retornou: $ready" }
} catch {
    Write-Host "O Kubernetes do Docker Desktop não está respondendo." -ForegroundColor Red
    Write-Host "[MANUAL] Habilite o Kubernetes no Docker Desktop: configurações → Kubernetes → Enable Kubernetes." -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Kubernetes do Docker Desktop responde." -ForegroundColor Green

# Verifica o Docker Desktop em si
try {
    docker version >$null 2>$null
    Write-Host "[OK] Docker CLI responde." -ForegroundColor Green
} catch {
    Write-Host "Docker CLI não responde. Inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Determina o GOOGLE_CLIENT_ID
# ---------------------------------------------------------------------------
if (-not $GoogleClientId) {
    $envFile = Join-Path $RepoRoot ".env"
    if (Test-Path $envFile) {
        $lines = Get-Content $envFile -Raw
        $match = [regex]::Match($lines, "^GOOGLE_CLIENT_ID=(.+)$", "Multiline")
        if ($match.Success) {
            $GoogleClientId = $match.Groups[1].Value.Trim()
            Write-Host "GOOGLE_CLIENT_ID lido do .env (não impresso por segurança)." -ForegroundColor Green
        }
    }
}
if (-not $GoogleClientId) {
    Write-Host "GOOGLE_CLIENT_ID não encontrado." -ForegroundColor Red
    Write-Host "Passe por -GoogleClientId 'SEU_ID.apps.googleusercontent.com' ou coloque no .env na raiz." -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# 1. Hosts file (Windows) - precisa de admin, avisa e tenta
# ---------------------------------------------------------------------------
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$hostsEntry = "127.0.0.1 sircurty.local grafana.sircurty.local otel.sircurty.local"
Write-Host ""
Write-Host "=== [MANUAL] Hosts file ===" -ForegroundColor Yellow
Write-Host "Certifique-se de que $hostsPath contém:"
Write-Host "  $hostsEntry"
Write-Host "(No Windows precisa abrir o editor como Administrador.)"
if (Test-Path $hostsPath) {
    $content = Get-Content $hostsPath -Raw
    if ($content -match "sircurty.local") {
        Write-Host "[OK] sircurty.local já está no hosts." -ForegroundColor Green
    } else {
        Write-Host "Não encontrado. Adicione manualmente ou rode este script como Administrador." -ForegroundColor Yellow
    }
}

# Testa resolução DNS
try {
    $addr = [System.Net.Dns]::GetHostAddresses("sircurty.local")
    if ($addr.IPAddressToString -contains "127.0.0.1") {
        Write-Host "[OK] sircurty.local resolve para 127.0.0.1." -ForegroundColor Green
    } else {
        Write-Host "sircurty.local resolve para $($addr.IPAddressToString -join ', ') (esperado 127.0.0.1)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "sircurty.local NÃO resolve. Confira o hosts file." -ForegroundColor Red
}

# ---------------------------------------------------------------------------
# 2. Ingress NGINX
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Ingress NGINX ===" -ForegroundColor Cyan
$ingressNs = kubectl get ns ingress-nginx -o name 2>$null
if (-not $ingressNs) {
    Write-Host "Instalando ingress-nginx..." -ForegroundColor Yellow
    kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml"
    Write-Host "Aguardando ingress-nginx ficar pronto..." -ForegroundColor Yellow
    kubectl wait --namespace ingress-nginx --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=180s
} else {
    Write-Host "[OK] ingress-nginx já instalado." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. Namespace sircurty (criado pelo chart também, mas garante)
# ---------------------------------------------------------------------------
kubectl apply -f k8s/charts/sircurty/templates/observability/namespace.yaml 2>$null | Out-Null
kubectl apply -f k8s/charts/sircurty/templates/app/namespace.yaml 2>$null | Out-Null

# ---------------------------------------------------------------------------
# 4. Secret sircurty-secrets (nunca commitado)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Secret sircurty-secrets ===" -ForegroundColor Cyan
$secretsExist = kubectl get secret sircurty-secrets -n sircurty -o name 2>$null
if ($secretsExist) {
    Write-Host "[OK] Secret sircurty-secrets já existe em sircurty." -ForegroundColor Green
} else {
    $postgresPwd = New-RandomPassword 16
    $jwtSecret   = New-RandomPassword 32
    $dbUrl       = "postgresql://sircurty:${postgresPwd}@postgres:5432/sircurty?schema=public"

    Write-Host "Criando Secret sircurty-secrets (senhas geradas aleatoriamente)..." -ForegroundColor Yellow
    kubectl create namespace sircurty --dry-run=client -o yaml | kubectl apply -f -
    kubectl -n sircurty create secret generic sircurty-secrets `
        --from-literal=POSTGRES_PASSWORD="$postgresPwd" `
        --from-literal=DATABASE_URL="$dbUrl" `
        --from-literal=JWT_SECRET="$jwtSecret" `
        --from-literal=GOOGLE_CLIENT_ID="$GoogleClientId"
    Write-Host "[OK] Secret criado." -ForegroundColor Green
    Write-Host "  POSTGRES_PASSWORD: $postgresPwd" -ForegroundColor Gray
    Write-Host "  DATABASE_URL:      $dbUrl" -ForegroundColor Gray
    Write-Host "  JWT_SECRET:        $jwtSecret" -ForegroundColor Gray
    Write-Host "  GOOGLE_CLIENT_ID:  (não impresso)" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# 5. Helm chart
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Helm chart sircurty ===" -ForegroundColor Cyan
$helmArgs = @(
    "upgrade", "--install", $ReleaseName, "k8s/charts/sircurty",
    "--namespace", $HelmNamespace,
    "--create-namespace",
    "--wait",
    "--timeout", "300s"
)
if ($ImageTag) {
    $helmArgs += "--set", "api.image.tag=$ImageTag"
    $helmArgs += "--set", "frontend.image.tag=$ImageTag"
    Write-Host "Usando tag de imagem: $ImageTag" -ForegroundColor Green
} else {
    Write-Host "Usando tags de values.yaml (SHA do GHCR)." -ForegroundColor Green
}

helm lint k8s/charts/sircurty | Out-Null
Write-Host "Rodando helm upgrade --install..." -ForegroundColor Yellow
& helm @helmArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha no helm upgrade." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[OK] Helm chart aplicado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 6. ArgoCD
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== ArgoCD ===" -ForegroundColor Cyan
$argocdNs = kubectl get ns argocd -o name 2>$null
if (-not $argocdNs) {
    Write-Host "Instalando ArgoCD (server-side apply)..." -ForegroundColor Yellow
    kubectl create namespace argocd
    kubectl apply -n argocd --server-side --force-conflicts `
        -f "https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml"
    # Reduz componentes pesados para economizar ~4 GB RAM
    kubectl -n argocd scale deploy argocd-dex-server --replicas=0 >$null 2>$null
    kubectl -n argocd scale deploy argocd-notifications-controller --replicas=0 >$null 2>$null
    kubectl -n argocd scale deploy argocd-applicationset-controller --replicas=0 >$null 2>$null
    Write-Host "Aguardando ArgoCD ficar pronto..." -ForegroundColor Yellow
    kubectl -n argocd rollout status deploy/argocd-server --timeout=240s >$null
    kubectl -n argocd rollout status deploy/argocd-repo-server --timeout=240s >$null
    kubectl -n argocd rollout status deploy/argocd-redis --timeout=240s >$null
    kubectl -n argocd rollout status statefulset/argocd-application-controller --timeout=240s >$null
    Write-Host "[OK] ArgoCD instalado." -ForegroundColor Green
} else {
    Write-Host "[OK] ArgoCD já instalado." -ForegroundColor Green
}

# Aplica o Application (faz ArgoCD adotar os recursos já criados pelo helm)
Write-Host "Aplicando Application sircurty-dev..." -ForegroundColor Yellow
kubectl apply -f k8s/argocd/application.yaml
Write-Host "[OK] Application aplicado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 7. Aguarda pods prontos
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Aguardando pods prontos ===" -ForegroundColor Cyan
$namespaces = @("sircurty", "observability", "argocd")
foreach ($ns in $namespaces) {
    Write-Host "Namespace $ns:" -ForegroundColor Gray
    kubectl wait --namespace $ns --for=condition=ready pod --all --timeout=300s 2>$null | Out-Null
    kubectl get pods -n $ns
}

# ---------------------------------------------------------------------------
# 8. Validação básica pelo ingress
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Validação pelo ingress ===" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "http://sircurty.local/health/ready" -Method Get -TimeoutSec 15 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        Write-Host "[OK] http://sircurty.local/health/ready → $($resp.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "http://sircurty.local/health/ready → $($resp.StatusCode) (esperado 200)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Não foi possível acessar http://sircurty.local/. Confira o hosts file e o ingress." -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Reset concluído. Acesse http://sircurty.local" -ForegroundColor Cyan
Write-Host "  ArgoCD UI: https://localhost:8085 (port-forward se necessário)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
