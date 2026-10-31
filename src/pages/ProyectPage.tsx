import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom" 
import { usePeriodStore } from "@/store/periodStore"
import { StatusBadge } from "@/components/common/StatusBadge"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTrigger, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import api from "@/api/axios"
import { 
  Loader2, 
  FileText, 
  Code2, 
  CheckCircle2Icon, 
  Pencil, 
  Plus, 
  Check, 
  AlertCircleIcon, 
  Search,
  Zap,
  Trash2, 
  AlertTriangle,
  Lock,
  Globe,
  User,
  Eye,
  EyeOff
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card } from "@/components/ui/card"
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"
import { useAuthStore } from "@/store/authStore" 
import { ProjectFilesPanel } from "@/components/projects/ProjectFilesPanel"
import { MemberPicker } from "@/components/projects/MemberPicker"
import { SimilarProjectsHint } from "@/components/projects/SimilarProjectsHint"
import { ReviewBadge } from "@/components/common/ReviewBadge"
import { LineageTree, type LineageNode } from "@/components/common/LineageTree"
import { GitBranch } from "lucide-react"

const skillSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
})

const projectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La problemática es obligatoria"),
  summary: z.string().optional(),
  deliverables: z.string().optional(),
  link: z.string().optional(), 
  cycle: z.string().min(1, "Selecciona un ciclo"),
  academic_period: z.string().min(1, "Selecciona un período"),
  careerId: z.string().min(1, "Selecciona una carrera"),
  objectives: z.string().min(1, "Debes ingresar al menos un objetivo"),
  status: z.string().optional(),
})

type Project = {
  id: string
  name: string
  description: string
  status: string
  objectives: string[]
  problems: string
  summary: string
  cycle: string
  academic_period: string
  createdBy: string
  reviewStatus?: string
  reviewNote?: string | null
  level?: number | null
  parentId?: string | null
  rootId?: string | null
  branchNumber?: number
  parent?: { id: string; name: string } | null
  reviewedBy?: { id: string; name: string } | null
  _count?: { branches: number }
  user: {
    id: string
    name: string
    email: string
  }
  startDate?: string | null
  endDate?: string | null
  userProjects?: { id: string; userId: string; user: { id: string; name: string; level?: number | null } }[]
  careerId: string
  createdAt?: string
  updatedAt?: string
  deliverables: string[]
  projectSkills?: { id: string, skillId: string, skill: Skill }[] 
}

type Career = { id: string, name: string }
type UserType = { id: string, careerId: string, roleId: string, email: string, name: string }
type Skill = { 
  id: string, 
  name: string, 
  description: string, 
  details: any,
  createdById?: string 
}
type Role = { id: string, name: string }
type PageMeta = { total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean }

const LIMIT = 20

const ProyectPage = () => {
  const { id } = useParams() 
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPeriod = usePeriodStore((s) => s.period)

  const currentUser = useAuthStore((s) => s.user); 

  const [projects, setProjects] = useState<Project[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [page, setPage] = useState(1)
  const [skills, setSkills] = useState<Skill[]>([])
  const [careers, setCareers] = useState<Career[]>([])
  const [user, setUser] = useState<UserType | null>(null)
  const [role, setRole] = useState<Role[]>([])
  const [periods, setPeriods] = useState<{id: string, name: string}[]>([])
  
  const userId = localStorage.getItem('id')

  // Reglas del flujo: el estudiante solo modifica lo suyo mientras NO esté aprobado; admin todo.
  const myRole = (currentUser as any)?.role?.name as string | undefined
  const isStudent = myRole === 'USER'
  const canModify = (p: Project) =>
    myRole === 'ADMIN' || (p.createdBy === userId && !(isStudent && p.reviewStatus === 'approved'))

  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("") 

  const [errorAlert, setErrorAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState("Hubo un problema.")

  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [q, setQ] = useState(search) // búsqueda ya aplicada (con retardo)
  const [skillSearch, setSkillSearch] = useState("")
  const [manageSkillSearch, setManageSkillSearch] = useState("")
  
  const [filterStatus, setFilterStatus] = useState("Todo");
  const [filterReview, setFilterReview] = useState("Todo");
  const [branchTarget, setBranchTarget] = useState<Project | null>(null)
  const [branchName, setBranchName] = useState("")
  const [branchPeriod, setBranchPeriod] = useState("")
  const [lineage, setLineage] = useState<LineageNode[]>([])
  const [filterCareer, setFilterCareer] = useState("");
  const [filterStatusUserProjects, setFilterStatusUserProjects] = useState("Todo")
  
  // COMENTADO: Quitamos el estado pendiente del filtro de opciones
  /*
  const statusOptions = isAdminOrTeacher 
    ? ["Todo", "en progreso", "completado", "pendiente"] 
    : ["Todo", "en progreso", "completado"];
  */
  const statusOptions = ["Todo", "en progreso", "completado"];

  const statusUserProjects = ["Todo", "Mis proyectos"]

  const [viewProject, setViewProject] = useState<Project | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Sincroniza con la barra superior: ?q= busca y ?nuevo=1 abre el formulario de registro
  useEffect(() => {
    setSearch(searchParams.get("q") || "")
    if (searchParams.get("nuevo") === "1") {
      createProjectForm.reset({ ...createProjectForm.getValues(), careerId: isStudent ? ((currentUser as any)?.careerId || '') : '' })
      setSelectedSkills([])
      setSelectedMembers([])
      setIsCreateOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete("nuevo")
      setSearchParams(next, { replace: true })
    }
  }, [searchParams])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  
  const [isSkillsManagerOpen, setIsSkillsManagerOpen] = useState(false)
  const [isCreateSkillOpen, setIsCreateSkillOpen] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  
  const [activeTab, setActiveTab] = useState<"mine" | "community">("mine")
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [editSkillName, setEditSkillName] = useState('')
  const [editSkillDesc, setEditSkillDesc] = useState('')
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null)
  const [visibleDescriptions, setVisibleDescriptions] = useState<Record<string, boolean>>({})

  const createSkillForm = useForm<z.infer<typeof skillSchema>>({
    resolver: zodResolver(skillSchema),
    defaultValues: { name: "", description: "" }
  })

  const createProjectForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "", description: "", summary: "", deliverables: "", link: "",
      cycle: "", academic_period: "",
      careerId: "", objectives: "", status: "en progreso",
    }
  })

  const editProjectForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "", description: "", summary: "", deliverables: "", link: "",
      cycle: "", academic_period: "",
      careerId: "", objectives: "", status: "",
    }
  })

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 4000)
  }

  const showError = (msg: string) => {
    setErrorMessage(msg)
    setErrorAlert(true)
    setTimeout(() => setErrorAlert(false), 4000)
  }

  // Búsqueda con retardo y vuelta a la página 1 cuando cambia cualquier filtro
  useEffect(() => { const t = setTimeout(() => setQ(search), 350); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(1) }, [q, filterStatus, filterReview, filterCareer, filterStatusUserProjects, selectedPeriod])

  // El servidor filtra y pagina; solo se descarga la página visible
  const requestId = useRef(0)
  const fetchProjects = useCallback(async () => {
    const current = ++requestId.current
    setLoadingProjects(true)
    try {
      const params: Record<string, string | number | boolean> = { page, limit: LIMIT }
      if (q.trim()) params.search = q.trim()
      if (filterStatus !== "Todo") params.status = filterStatus
      if (filterReview !== "Todo") params.reviewStatus = filterReview
      if (filterCareer) params.careerId = filterCareer
      if (filterStatusUserProjects === "Mis proyectos") params.mine = true
      if (selectedPeriod) params.period = selectedPeriod
      const res = await api.get("/api/projects", { params })
      if (current !== requestId.current) return // llegó una respuesta más nueva
      setProjects(res.data.data || [])
      setMeta(res.data.meta || null)
    } catch (error) {
      console.log(error)
    } finally {
      if (current === requestId.current) setLoadingProjects(false)
    }
  }, [page, q, filterStatus, filterReview, filterCareer, filterStatusUserProjects, selectedPeriod])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const fetchSkillsData = async () => {
    try {
      const resSkills = await api.get('/api/skills?limit=1000')
      const skillsRaw = resSkills.data
      setSkills(Array.isArray(skillsRaw) ? skillsRaw : (skillsRaw.data || []))
    } catch (error) {
      console.log(error)
    }
  }

  const fetchPeriods = async () => {
    try {
      const res = await api.get('/api/period');
      setPeriods(res.data);
    } catch (error) {
      console.log("Error cargando periodos", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [careersRes, rolesRes] = await Promise.all([
          api.get('/api/careers?limit=1000'), 
          api.get('/api/roles?limit=1000')
        ])
        const careersData = careersRes.data
        setCareers(Array.isArray(careersData) ? careersData : (careersData.data || []))
        const rolesData = rolesRes.data
        setRole(Array.isArray(rolesData) ? rolesData : (rolesData.data || []))
      } catch (error) {
        console.log(error)
      }
    }
    fetchData()
    fetchSkillsData()
    fetchPeriods() 

    const fetchUser = async () => {
      if (!userId) return
      try {
        const response = await api.get(`/api/users/${userId}`)
        setUser(response.data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchUser()
  }, [])

  // /projects/:id: el proyecto puede no estar en la página visible, se pide al servidor
  useEffect(() => {
    if (!id) return
    let cancelled = false
    api.get(`/api/projects/${id}`).then((res) => {
      if (cancelled) return
      const found: Project = res.data
      if (searchParams.get("editar") === "1") {
        // Llegada desde el panel de administración: abre directo la edición
        loadProjectData(found)
        const next = new URLSearchParams(searchParams); next.delete("editar")
        setSearchParams(next, { replace: true })
      } else {
        setViewProject(found);
        setIsViewOpen(true);
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [id]);

  const roleName = user && role.length > 0 ? role.find(r => r.id === user.roleId)?.name : "";
  const isAdmin = roleName?.toLowerCase().includes("admin");

  const getProjectSkillsDisplay = (project?: Project | null) =>
    (project?.projectSkills || []).map(ps => ps.skill).filter(Boolean)

  const parseDeliverables = (items: string[]) => {
    const link = items.find(item => item.startsWith('http') || item.startsWith('https'));
    const textItems = items.filter(item => !item.startsWith('http') && !item.startsWith('https'));
    return { link, textItems };
  }

  const handleCreateSkill = async (values: z.infer<typeof skillSchema>) => {
    setLoading(true)
    try {
      await api.post('/api/skills', {
        name: values.name,
        description: values.description,
        details: { level: "N/A", category: "N/A" } 
      })
      await fetchSkillsData();
      setLoading(false); 
      setTimeout(() => showSuccess("Habilidad creada correctamente."), 300);
      createSkillForm.reset();
      setIsCreateSkillOpen(false);
    } catch (error: any) {
      setLoading(false);
      if (error.response && error.response.status === 409) {
        showError("Habilidad ya agregada");
      } else {
        showError("Hubo un problema al crear la habilidad.");
      }
    }
  }

  const handleUpdateSkill = async () => {
    if (!editingSkill || !editSkillName.trim()) return
    setLoading(true)
    try {
      await api.patch(`/api/skills/${editingSkill.id}`, {
        name: editSkillName,
        description: editSkillDesc
      })
      await fetchSkillsData()
      setEditingSkill(null)
      setLoading(false);
      setTimeout(() => showSuccess("Habilidad actualizada correctamente."), 300);
    } catch (error) {
      setLoading(false);
      showError("Error al actualizar.");
    }
  }

  const handleDeleteSkill = async () => {
    if(!skillToDelete) return;
    setLoading(true)
    try {
      await api.delete(`/api/skills/${skillToDelete.id}`)
      await fetchSkillsData()
      setSkillToDelete(null)
      setLoading(false);
      setTimeout(() => showSuccess("Habilidad eliminada correctamente."), 300);
    } catch (error) {
      setLoading(false);
      showError("No se pudo eliminar.");
    }
  }

  const toggleVisibility = (skillId: string) => {
    setVisibleDescriptions(prev => ({
      ...prev,
      [skillId]: !prev[skillId]
    }))
  }

  const handleCreateProyect = async (values: z.infer<typeof projectSchema>) => {
    setLoading(true) 
    try {
      const objectivesArray = values.objectives.split("\n").filter(l => l.trim().length > 0)
      let deliverablesArray = values.deliverables ? values.deliverables.split("\n").filter(l => l.trim().length > 0) : []
      
      // COMENTADO: El estado inicial pasa a ser en progreso directamente
      // const initialStatus = "pendiente";
      const initialStatus = "en progreso"; 

      const res = await api.post('/api/projects', {
        name: values.name,
        description: values.description,
        summary: values.summary,
        cycle: values.cycle,
        academic_period: values.academic_period,
        careerId: values.careerId,
        status: initialStatus,
        objectives: objectivesArray,
        deliverables: deliverablesArray, 
        createdBy: userId,
      });

      const projectId = res.data.id;
      if (projectId && selectedSkills.length > 0) {
        await Promise.all(selectedSkills.map(skillId =>
          api.post('/api/porjects-skills', { projectId, skillId })
        )).catch(e => console.log("Error menor guardando skills:", e));
      }

      if (projectId && selectedMembers.length > 0) {
        await api.put(`/api/projects/${projectId}/members`, { userIds: selectedMembers })
          .catch(e => console.log("Error menor guardando integrantes:", e));
      }

      setIsCreateOpen(false); 
      createProjectForm.reset();
      setSelectedSkills([]);
      setSelectedMembers([]);
      fetchProjects();
      fetchSkillsData();
      setLoading(false);
      if (isStudent) {
        navigate('/mis-proyectos', { state: { created: true } })
        return
      }
      setTimeout(() => showSuccess("Proyecto guardado correctamente"), 300);
    } catch (error) {
      setLoading(false); 
      showError("Hubo un problema al crear el proyecto.");
    }
  };

  /*const handleApproveProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await api.patch(`/api/projects/${project.id}`, { status: "en progreso" });
      await fetchProjects();
      setLoading(false);
      setTimeout(() => showSuccess("Proyecto aceptado"), 300);
    } catch (error) {
      setLoading(false);
      showError("Error al aprobar.");
    }
  };
*/
  const handleEditProyect = async (values: z.infer<typeof projectSchema>) => {
    if (!editingProject) return
    setLoading(true)
    try {
      const objectivesArray = values.objectives.split("\n").filter(l => l.trim().length > 0)
      let deliverablesArray = values.deliverables ? values.deliverables.split("\n").filter(l => l.trim().length > 0) : []

      await api.patch(`/api/projects/${editingProject.id}`, {
        name: values.name,
        description: values.description,
        summary: values.summary,
        cycle: values.cycle,
        academic_period: values.academic_period,
        careerId: values.careerId,
        status: values.status, 
        objectives: objectivesArray,
        deliverables: deliverablesArray,
      });

      const currentRelations = editingProject.projectSkills || [];
      const currentSkillIds = currentRelations.map((ps: any) => ps.skillId || ps.skill?.id);
      
      const skillsToAdd = selectedSkills.filter(sid => !currentSkillIds.includes(sid));
      const relationsToDelete = currentRelations.filter((rel: any) => !selectedSkills.includes(rel.skillId || rel.skill?.id));

      const promises: Promise<any>[] = [];

      skillsToAdd.forEach(skillId => {
        promises.push(
          api.post('/api/porjects-skills', { projectId: editingProject.id, skillId })
            .catch(error => {
              if (error.response && (error.response.status === 400 || error.response.status === 409)) return null;
              throw error;
            })
        );
      });

      relationsToDelete.forEach((rel: any) => {
        const relId = rel.id;
        if (relId) promises.push(api.delete(`/api/porjects-skills/${relId}`));
      });
      
      await Promise.all(promises);
      await api.put(`/api/projects/${editingProject.id}/members`, { userIds: selectedMembers })
        .catch(e => console.log("Error menor guardando integrantes:", e));
      
      await fetchProjects();
      await fetchSkillsData();
      
      setIsEditOpen(false)
      setLoading(false);
      setTimeout(() => showSuccess("Proyecto actualizado correctamente"), 300);
    } catch (error) {
      console.error(error);
      setLoading(false);
      showError("Error al editar el proyecto.");
    }
  };

  const openBranchDialog = (project: Project) => {
    setBranchTarget(project)
    setBranchName(`${project.name} (continuación)`)
    setBranchPeriod(periods[0]?.name || "")
  }

  const handleBranch = async () => {
    if (!branchTarget) return
    setLoading(true)
    try {
      const res = await api.post(`/api/projects/${branchTarget.id}/branch`, { name: branchName.trim() || undefined, academic_period: branchPeriod || undefined })
      setBranchTarget(null)
      setIsViewOpen(false)
      await fetchProjects()
      setLoading(false)
      setTimeout(() => showSuccess(res.data?.reviewStatus === 'pending'
        ? "Continuación creada: quedó pendiente de revisión de tu docente"
        : "Continuación creada correctamente"), 300)
    } catch (error: any) {
      setLoading(false)
      setBranchTarget(null)
      showError(error?.response?.data?.message || "No se pudo crear la continuación.")
    }
  }

  const openProject = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId)
    if (found) { setViewProject(found); setIsViewOpen(true); return }
    // Fuera de la página visible: se pide al servidor
    api.get(`/api/projects/${projectId}`).then((res) => { setViewProject(res.data); setIsViewOpen(true) }).catch(() => {})
  }

  // Historial de continuidad del proyecto que se está viendo
  useEffect(() => {
    setLineage([])
    if (!isViewOpen || !viewProject) return
    if (!viewProject.parentId && !(viewProject._count?.branches)) return
    api.get(`/api/projects/${viewProject.id}/lineage`)
      .then((res) => setLineage(res.data?.nodes || []))
      .catch(() => setLineage([]))
  }, [isViewOpen, viewProject?.id])

  const handleDeleteProyect = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await api.delete(`/api/projects/${id}`)
      await fetchProjects()
      await fetchSkillsData()
      setLoading(false);
      setTimeout(() => showSuccess("Proyecto eliminado"), 300);
    } catch (error) {
      setLoading(false);
      showError("No se pudo eliminar.");
    }
  }

  const loadProjectData = (project: Project) => {
    setEditingProject(project)
    const existingSkillIds = project.projectSkills?.map(ps => ps.skillId || ps.skill.id) || [];
    
    setSelectedSkills(existingSkillIds);
    setSelectedMembers((project.userProjects || []).map((m) => m.userId).filter((id) => id !== project.createdBy));

    const { link, textItems } = parseDeliverables(project.deliverables || []);

    editProjectForm.reset({
      name: project.name,
      description: project.description,
      summary: project.summary || "",
      deliverables: textItems.join("\n") || "",
      link: link || "",
      cycle: project.cycle,
      academic_period: project.academic_period,
      careerId: project.careerId,
      objectives: project.objectives?.join("\n") || "",
      status: project.status
    })
    setIsEditOpen(true)
  };

  const toggleSkillSelection = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    );
  }

  const capitalizeFirst = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
  const filteredSkills = skills.filter(s => s.name.toLowerCase().includes(manageSkillSearch.toLowerCase()));
  const mySkillsList = filteredSkills.filter(s => s.createdById === userId);
  const otherSkillsList = filteredSkills.filter(s => s.createdById !== userId);

  const SkillCardItem = ({ skill, canEdit }: { skill: Skill, canEdit: boolean }) => {
    const isVisible = visibleDescriptions[skill.id];
    const isOwner = skill.createdById === userId;
    if (!isOwner && !canEdit) {
       return (
         <Card className="bg-white border border-slate-200 p-1 flex items-center justify-center shadow-sm hover:border-brand-600/30 transition-colors h-full">
            <div className="flex items-center gap-1 overflow-hidden w-full">
                <div className="p-0.5 rounded-md bg-slate-50 text-brand-600/70 shrink-0">
                  <Code2 className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-slate-400 whitespace-normal leading-tight text-left w-full" title={skill.name}>
                  {skill.name}
                </span>
            </div>
         </Card>
       )
    }

    return (
      <Card className="group relative bg-white border border-slate-200 hover:border-brand-600/50 transition-all duration-300 overflow-hidden flex flex-col shadow-sm hover:shadow-cyan-900/20 p-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/0 via-brand-50/0 to-brand-50/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200 bg-slate-50 gap-2">
          <div className="p-0.5 rounded-md bg-slate-50 text-brand-700 group-hover:text-brand-700 transition-colors shrink-0">
            <Code2 className="w-4 h-4" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 whitespace-normal leading-tight flex-1 text-center" title={skill.name}>
            {skill.name}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className={`h-5 w-5 shrink-0 transition-colors rounded-full p-0 ${isVisible ? "text-brand-700 bg-brand-50" : "text-slate-500 hover:text-slate-600 hover:bg-slate-50"}`}
            onClick={() => toggleVisibility(skill.id)}
            title={isVisible ? "Ocultar" : "Ver"}
          >
            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <div className="relative" style={{ minHeight: isVisible ? '3rem' : 'auto', maxHeight: isVisible ? '5.5rem' : 'auto' }}> 
           {isVisible ? (
             <div className="h-full overflow-y-auto px-2 custom-scrollbar">
               <p className="text-xs text-slate-400 leading-snug">
                 {skill.description}
               </p>
             </div>
           ) : (
             <div className="flex items-center justify-center text-slate-500 py-2">
                <Lock className="w-3 h-3 opacity-50" />
             </div>
           )}
        </div>
        {canEdit && (
          <div className="flex border-t border-slate-200 divide-x divide-slate-200 bg-slate-50">
            <button
              onClick={() => {
                setEditSkillName(skill.name);
                setEditSkillDesc(skill.description);
                setEditingSkill(skill);
              }}
              className="flex-1 flex items-center justify-center py-1.5 text-xs font-semibold text-amber-600/80 hover:text-amber-600 hover:bg-amber-50 transition-colors gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button
              onClick={() => setSkillToDelete(skill)}
              className="flex-1 flex items-center justify-center py-1.5 text-xs font-semibold text-red-600/80 hover:text-red-600 hover:bg-red-50 transition-colors gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </Card>
    )
  }

  const renderFormFields = (form: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem className="md:col-span-2"><FormLabel className="text-slate-400">Nombre del Proyecto</FormLabel><FormControl><Textarea className="bg-white border-slate-300 mt-1" {...field} /></FormControl><FormMessage className="text-red-600 text-xs" /></FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem className="md:col-span-2"><FormLabel className="text-slate-400">Problemática</FormLabel><FormControl><Textarea className="bg-white border-slate-300 mt-1" {...field} /></FormControl><FormMessage className="text-red-600 text-xs" /></FormItem>
      )} />
      <FormField control={form.control} name="summary" render={({ field }) => (
        <FormItem className="md:col-span-2"><FormLabel className="text-slate-400">Resumen</FormLabel><FormControl><Textarea className="bg-white border-slate-300 mt-1" {...field} /></FormControl><FormMessage className="text-red-600 text-xs" /></FormItem>
      )} />
      
      <FormField control={form.control} name="cycle" render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between h-8 mb-1">
             <FormLabel className="text-slate-400">Ciclo</FormLabel>
          </div>
          <FormControl>
            <select className="w-full h-9 rounded-md bg-white border border-slate-300 text-sm text-slate-900 px-3" {...field}>
              <option value="">Seleccionar...</option>
              <option>Primer Ciclo</option>
              <option>Segundo Ciclo</option>
              <option>Tercer Ciclo</option>
              <option>Cuarto Ciclo</option>
            </select>
          </FormControl>
          <FormMessage className="text-red-600 text-xs" />
        </FormItem>
      )} />

      <FormField control={form.control} name="academic_period" render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between h-8 mb-1">
            <FormLabel className="text-slate-400">Período</FormLabel>
          </div>
          <FormControl>
            <select className="w-full h-9 rounded-md bg-white border border-slate-300 text-sm text-slate-900 px-3" {...field}>
              <option value="">Seleccionar...</option>
              {periods.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </FormControl>
          {periods.length === 0 && <p className="text-xs text-amber-600">Aún no hay períodos. El administrador debe registrarlos en «Períodos académicos».</p>}
          <FormMessage className="text-red-600 text-xs" />
        </FormItem>
      )} />

      <FormField control={form.control} name="careerId" render={({ field }) => (
        <FormItem className="md:col-span-2"><FormLabel className="text-slate-400">Carrera</FormLabel><FormControl><select disabled={isStudent} title={isStudent ? "Tu carrera se toma de tu perfil" : undefined} className="w-full mt-1 h-9 rounded-md bg-white border border-slate-300 text-sm text-slate-900 px-3 disabled:opacity-70" {...field}><option value="">Seleccionar carrera...</option>{careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormControl><FormMessage className="text-red-600 text-xs" /></FormItem>
      )} />
      <MemberPicker careerId={form.watch("careerId")} selfId={userId} value={selectedMembers} onChange={setSelectedMembers} />
      <div className="md:col-span-2 bg-white p-4 rounded-lg border border-slate-200">
        <Label className="text-brand-700 font-bold mb-3 block items-center gap-2"><Code2 className="w-4 h-4" /> Habilidades Requeridas</Label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} type="text" placeholder="Buscar habilidad..." className="pl-9 bg-slate-50 border-slate-300 text-slate-900 text-sm h-9" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {skills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase())).map((skill) => {
            const isSelected = selectedSkills.includes(skill.id);
            return (
              <div key={skill.id} onClick={() => toggleSkillSelection(skill.id)} className={`relative flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-brand-50 border-brand-600/50 shadow-[0_0_10px_-4px_rgba(6,182,212,0.5)]' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-600'}`}>{isSelected && <Check className="w-3 h-3 text-black font-bold" />}</div>
                <span className={`text-xs font-medium whitespace-normal leading-tight ${isSelected ? 'text-brand-900' : 'text-slate-500 group-hover:text-slate-800'}`}>{skill.name}</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2 text-right">{selectedSkills.length} seleccionadas</p>
      </div>
      <FormField control={form.control} name="objectives" render={({ field }) => (
        <FormItem className="md:col-span-2"><FormLabel className="text-slate-400">Objetivos</FormLabel><FormControl><Textarea className="bg-white border-slate-300 mt-1 h-32" placeholder="- Objetivo 1&#10;" {...field} /></FormControl><FormMessage className="text-red-600 text-xs" /></FormItem>
      )} />
      <FormField control={form.control} name="deliverables" render={({ field }) => (
        <FormItem className="md:col-span-2"><FormLabel className="text-slate-400">Entregables (Texto)</FormLabel><FormControl><Textarea className="bg-white border-slate-300 mt-1 h-32" placeholder="- Entregable 1&#10;" {...field} /></FormControl><FormMessage className="text-red-600 text-xs" /></FormItem>
      )} />
      {/* CAMPO DE ESTADO ELIMINADO TANTO PARA EDITAR COMO PARA CREAR */}
    </div>
  )

  return (
    <div className="w-full text-slate-900">
      <main className="w-full relative">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
          <div className="flex-shrink-0">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Proyectos</h2>
            <p className="text-slate-500 text-sm mt-1">Gestión de proyectos - Sudamericano</p>
          </div>

          <div className="flex flex-col w-full xl:w-auto gap-4 md:items-end">
            <div className="flex flex-col md:flex-row gap-4 md:justify-end">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Buscar..." className="pl-10 bg-slate-50 border-slate-200 text-slate-900 focus:ring-brand-600 focus:border-brand-600" />
              </div>

              {(
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="hidden" aria-hidden tabIndex={-1} onClick={() => { createProjectForm.reset(); setSelectedSkills([]); setSelectedMembers([]) }}>
                      + Nuevo Proyecto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-50 border-slate-200 text-slate-900">
                    <DialogHeader><DialogTitle className="text-xl font-bold text-brand-700">Crear nuevo proyecto</DialogTitle></DialogHeader>
                    <Form {...createProjectForm}>
                      <form onSubmit={createProjectForm.handleSubmit(handleCreateProyect)}>
                        {renderFormFields(createProjectForm)}
                        <SimilarProjectsHint name={createProjectForm.watch("name")} description={createProjectForm.watch("description")} />
                        <DialogFooter>
                          <Button type="button" variant="ghost" className="hover:bg-slate-100" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                          <Button type="submit" className="bg-brand-700 hover:bg-brand-800" disabled={loading}>{loading ? "Creando..." : "Guardar Proyecto"}</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 p-1">
              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-brand-700/80 uppercase tracking-wide">Estado</h5>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <Badge key={status} onClick={() => setFilterStatus(status)} variant={filterStatus === status ? "default" : "outline"} className={`cursor-pointer px-3 py-1 transition-all ${filterStatus === status ? "bg-brand-700 hover:bg-brand-800 text-white border-brand-600" : "text-slate-500 border-slate-300 hover:border-brand-600 hover:text-brand-700"}`}>{capitalizeFirst(status)}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-brand-700/80 uppercase tracking-wide">Revisión</h5>
                <div className="flex flex-wrap gap-2">
                  {[["Todo", "Todo"], ["approved", "Aprobados"], ["pending", "Pendientes"], ["rejected", "Rechazados"]].map(([value, label]) => (
                    <Badge key={value} onClick={() => setFilterReview(value)} variant={filterReview === value ? "default" : "outline"} className={`cursor-pointer px-3 py-1 transition-all ${filterReview === value ? "bg-brand-700 hover:bg-brand-800 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>{label}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-brand-700/80 uppercase tracking-wide">Carrera</h5>
                <select
                  value={filterCareer}
                  onChange={(e) => setFilterCareer(e.target.value)}
                  aria-label="Filtrar por carrera"
                  className="h-7 max-w-[220px] rounded-full border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                >
                  <option value="">Todas</option>
                  {careers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>

              {(
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-brand-700/80 uppercase tracking-wide">Origen</h5>
                  <div className="flex flex-wrap gap-2">
                    {statusUserProjects.map((option) => (
                      <Badge key={option} onClick={() => setFilterStatusUserProjects(option)} variant={filterStatusUserProjects === option ? "default" : "outline"} className={`cursor-pointer px-3 py-1 transition-all ${filterStatusUserProjects === option ? "bg-brand-700 hover:bg-brand-800 text-white border-brand-700" : "text-slate-500 border-slate-300 hover:border-brand-600 hover:text-brand-700"}`}>{capitalizeFirst(option)}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loadingProjects ? (
          <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" /><p className="text-slate-500">Cargando proyectos...</p></div>
        ) : (
          <div className="space-y-10">
            <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Directorio Completo de Proyectos</h2>
                
                {(
                  <Dialog open={isSkillsManagerOpen} onOpenChange={setIsSkillsManagerOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 font-semibold gap-2"><Zap className="w-4 h-4" /> Gestionar Habilidades</Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-sm bg-white border-slate-200 text-slate-900 flex flex-col max-h-[80vh]">
                      <DialogHeader className="flex flex-col gap-2 pr-3.5">
                          <div className="flex items-center justify-between">
                            <DialogTitle className="text-lg font-bold text-brand-700 flex items-center gap-2"><Zap className="w-4 h-4" /> Habilidades</DialogTitle>
                            <Dialog open={isCreateSkillOpen} onOpenChange={setIsCreateSkillOpen}>
                              <DialogTrigger asChild><Button size="sm" variant="outline" className="border-brand-600 text-brand-700 hover:bg-brand-50 gap-2 h-7 text-xs"><Plus className="w-3 h-3" /> Nueva</Button></DialogTrigger>
                              <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 z-[60]">
                                <DialogHeader><DialogTitle>Crear Nueva Habilidad</DialogTitle></DialogHeader>
                                <Form {...createSkillForm}><form onSubmit={createSkillForm.handleSubmit(handleCreateSkill)} className="space-y-4 py-4"><FormField control={createSkillForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input className="bg-white border-slate-300" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={createSkillForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Input className="bg-white border-slate-300" {...field} /></FormControl><FormMessage /></FormItem>)} /><DialogFooter><Button type="button" variant="ghost" onClick={() => setIsCreateSkillOpen(false)}>Cancelar</Button><Button type="submit" className="bg-brand-700 hover:bg-brand-800" disabled={loading}>Crear</Button></DialogFooter></form></Form>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <div className="flex p-1 bg-slate-50 rounded-lg border border-slate-200 mt-1">
                            <button onClick={() => setActiveTab("mine")} className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-md transition-all ${activeTab === "mine" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><User className="w-3 h-3" /> Mis Habilidades</button>
                            <button onClick={() => setActiveTab("community")} className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-md transition-all ${activeTab === "community" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Globe className="w-3 h-3" /> Comunidad Global</button>
                          </div>
                          <div className="relative mt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" /><Input value={manageSkillSearch} onChange={(e) => setManageSkillSearch(e.target.value)} type="text" placeholder="Buscar habilidad..." className="pl-8 bg-slate-50 border-slate-300 text-slate-900 text-xs h-8" /></div>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto pr-1 mt-2">
                        {activeTab === "mine" && (<div className="space-y-2">{mySkillsList.length === 0 ? (<div className="text-center p-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">No tienes habilidades creadas aún.</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{mySkillsList.map(skill => (<SkillCardItem key={skill.id} skill={skill} canEdit={true} />))}</div>)}</div>)}
                        {activeTab === "community" && (<div className="space-y-2">{otherSkillsList.length === 0 ? (<div className="text-center p-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">No hay habilidades de la comunidad.</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{otherSkillsList.map(skill => (<SkillCardItem key={skill.id} skill={skill} canEdit={isAdmin || false} />))}</div>)}</div>)}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white">
                    <TableRow className="border-slate-200 hover:bg-white">
                      <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold min-w-[320px]">Proyecto</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Tecnologías</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold min-w-[140px]">Estado y período</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center h-32 text-slate-500">No se encontraron proyectos.</TableCell></TableRow>) : (
                      // Los filtros (búsqueda, estado, revisión, carrera, origen y período) los aplica el servidor
                      projects.map((p) => {
                        const careerName = careers.find((c) => c.id === p.careerId)?.name;
                        const mySkills = getProjectSkillsDisplay(p);
                        
                        // CALCULAR ESTADO PARA MOSTRAR

                        // COMENTADO: Quitamos el fondo rojo para pendientes
                        // ORIGINAL: className={`... ${p.status === 'pendiente' ? 'bg-red-50 hover:bg-red-50' : 'hover:bg-slate-100' }`}
                        return (
                          <TableRow key={p.id} className="border-slate-200 transition-colors group align-top cursor-pointer hover:bg-slate-100" onClick={() => { setViewProject(p); setIsViewOpen(true); }}>
                            <TableCell className="py-4 align-top">
                              <div className="flex items-start gap-3 min-w-[280px]">
                                <InitialsAvatar name={p.user?.name} className="mt-0.5" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 leading-tight group-hover:text-brand-700" title={p.name}>{p.name}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{p.user?.name || "Sin responsable"} · {careerName || "Sin carrera"}</p>
                                  {p.parent && (<p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700"><GitBranch className="w-3 h-3" /> Continuación de {p.parent.name}</p>)}
                                  {p.reviewStatus === 'rejected' && p.reviewNote && p.createdBy === userId && (<p className="mt-1 text-xs text-red-600">Motivo: {p.reviewNote}</p>)}
                                  <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 max-w-md">{p.description}</p>
                                  <p className="mt-1.5 text-[11px] text-slate-400">{[p.academic_period, p.cycle].filter(Boolean).join(" · ")}</p>
                                  {(p.userProjects?.length ?? 0) > 1 && (<p className="mt-1 text-[11px] text-slate-500">Integrantes: {p.userProjects!.map((m) => m.user.name).join(", ")}</p>)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 align-top">
                              {mySkills.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                  {mySkills.slice(0, 4).map(sk => (<Badge key={sk.id} variant="secondary" className="bg-brand-50 text-brand-800 border border-brand-100 text-[11px] px-2 py-0.5 font-medium">{sk.name}</Badge>))}
                                  {mySkills.length > 4 && <span className="text-[11px] text-slate-500 self-center">+{mySkills.length - 4}</span>}
                                </div>
                              ) : (<span className="text-xs text-slate-400">Sin tecnologías</span>)}
                            </TableCell>
                            <TableCell className="py-4 align-top">
                              <div className="space-y-3">
                                {/* COMENTADO: Ya no se renderiza el badge de pendiente */}
                                {/* {displayStatus === 'pendiente' ? (
                                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 flex w-fit items-center gap-1"><Clock className="w-3 h-3" /> Pendiente</Badge>
                                ) : ( */}
                                  <div className="flex flex-wrap gap-1.5"><StatusBadge status={p.status} startDate={p.startDate} endDate={p.endDate} /><ReviewBadge status={p.reviewStatus} /></div>
                                {/* )} */}
                                <div className="text-xs text-slate-500"><span>Período:</span> <br />{p.academic_period || "—"}</div>
                              </div>
                            </TableCell>
                            {(
                              <TableCell className="py-4 align-top text-right">
                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  {/* COMENTADO: Botón de aprobar proyecto ya no es necesario */}
                                  {/* {isAdmin && p.status === 'pendiente' && (<Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white mr-2" onClick={(e) => handleApproveProject(e, p)}><Check className="w-4 h-4" /></Button>)} */}
                                  {p.reviewStatus === 'approved' && (<Button variant="ghost" size="icon" title="Continuar este proyecto" aria-label="Continuar este proyecto" className="h-8 w-8 text-brand-600 hover:text-brand-700 hover:bg-brand-50" onClick={() => openBranchDialog(p)}><GitBranch className="w-4 h-4" /></Button>)}
                                  {canModify(p) && (<Button variant="ghost" size="icon" title="Editar" aria-label="Editar" className="h-8 w-8 text-brand-600 hover:text-brand-700 hover:bg-brand-50" onClick={() => loadProjectData(p)}><Pencil className="w-4 h-4" /></Button>)}
                                  {canModify(p) && (<Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" title="Eliminar" aria-label="Eliminar" className="h-8 w-8 text-red-600 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></DialogTrigger><DialogContent className="bg-slate-50 border-slate-200 text-slate-900"><DialogHeader><DialogTitle>¿Eliminar Proyecto?</DialogTitle></DialogHeader><DialogDescription className="text-slate-500">Esta acción no se puede deshacer.</DialogDescription><DialogFooter><Button className="bg-red-600 hover:bg-red-700" onClick={(e) => handleDeleteProyect(e, p.id)}>Confirmar</Button></DialogFooter></DialogContent></Dialog>)}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {meta && meta.total > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <span>{meta.total} proyectos · página {page} de {Math.max(meta.totalPages, 1)}</span>
                  {meta.totalPages > 1 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {success && (<div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300"><Alert className="w-auto bg-green-600 border-green-500 text-white shadow-2xl flex items-center gap-3 pr-6"><CheckCircle2Icon className="h-6 w-6 text-white" /><div><AlertTitle className="text-white font-bold text-lg">Éxito</AlertTitle><AlertDescription className="text-white font-medium text-base">{successMessage}</AlertDescription></div></Alert></div>)}
            {errorAlert && (<div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300"><Alert className="w-auto bg-red-600 border-red-500 text-white shadow-2xl flex items-center gap-3 pr-6"><AlertCircleIcon className="h-6 w-6 text-white" /><div><AlertTitle className="text-white font-bold text-lg">Error</AlertTitle><AlertDescription className="text-white font-medium text-base">{errorMessage}</AlertDescription></div></Alert></div>)}
          </div>
        )}
      </main>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-50 border-slate-200 text-slate-900 z-[90]">
          <DialogHeader><DialogTitle className="text-xl font-bold text-brand-700">Editar Proyecto</DialogTitle></DialogHeader>
          {editingProject?.reviewStatus === 'rejected' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">Este proyecto fue rechazado</p>
              {editingProject.reviewNote && <p className="mt-1 whitespace-pre-wrap">{editingProject.reviewNote}</p>}
              <p className="mt-1 text-xs">Al guardar tus correcciones se enviará de nuevo a revisión.</p>
            </div>
          )}
          <Form {...editProjectForm}>
            <form onSubmit={editProjectForm.handleSubmit(handleEditProyect)}>
                {renderFormFields(editProjectForm)}
                <DialogFooter>
                    <Button type="button" variant="ghost" className="hover:bg-slate-100" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={loading}>Guardar Cambios</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingSkill} onOpenChange={(open) => !open && setEditingSkill(null)}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 z-[70]"><DialogHeader><DialogTitle>Editar Habilidad</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Nombre</Label><Input value={editSkillName} onChange={(e) => setEditSkillName(e.target.value)} className="bg-white border-slate-300" /></div><div className="space-y-2"><Label>Descripción</Label><Textarea value={editSkillDesc} onChange={(e) => setEditSkillDesc(e.target.value)} className="bg-white border-slate-300" /></div></div><DialogFooter><Button variant="ghost" onClick={() => setEditingSkill(null)}>Cancelar</Button><Button className="bg-brand-700 hover:bg-brand-800" onClick={handleUpdateSkill}>Guardar</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!skillToDelete} onOpenChange={(open) => !open && setSkillToDelete(null)}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 z-[80] max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Eliminar</DialogTitle><DialogDescription className="text-slate-500 mt-2">¿Eliminar <span className="text-slate-900 font-bold">"{skillToDelete?.name}"</span>?</DialogDescription></DialogHeader><DialogFooter className="mt-4 gap-2 sm:gap-0"><Button variant="ghost" onClick={() => setSkillToDelete(null)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700" onClick={handleDeleteSkill}>Eliminar</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) { navigate('/projects'); } }}>
        <DialogContent className="w-[95vw] md:w-full md:max-w-4xl bg-white border-slate-200 text-slate-900 p-0 z-[60]">
          <div className="max-h-[85vh] overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 break-words">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-brand-700 flex items-center gap-2"><FileText className="w-6 h-6" /> {viewProject?.name}</DialogTitle></DialogHeader>
            {viewProject && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewBadge status={viewProject.reviewStatus} />
                  {viewProject.level ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">Nivel {viewProject.level}</span> : null}
                  {viewProject.parent && (
                    <button type="button" onClick={() => openProject(viewProject.parent!.id)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                      <GitBranch className="w-3 h-3" /> Continuación de {viewProject.parent.name}
                    </button>
                  )}
                </div>
                {viewProject.reviewNote && (
                  <div className={`rounded-lg border p-3 text-sm ${viewProject.reviewStatus === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide">Observación del docente{viewProject.reviewedBy ? ` · ${viewProject.reviewedBy.name}` : ''}</p>
                    <p className="mt-1 whitespace-pre-wrap">{viewProject.reviewNote}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg"><div><h4 className="text-xs font-bold text-brand-600 uppercase mb-1">Carrera</h4><p className="text-sm">{careers.find(c => c.id === viewProject.careerId)?.name || "N/A"}</p></div><div className="md:col-span-2"><h4 className="text-xs font-bold text-brand-600 uppercase mb-1">Integrantes</h4><p className="text-sm text-slate-600">{viewProject.userProjects?.length ? viewProject.userProjects.map((m) => m.user.name).join(", ") : (viewProject.user?.name || "Sin integrantes")}</p></div><div><h4 className="text-xs font-bold text-brand-600 uppercase mb-1">Período & Ciclo</h4><p className="text-sm">{viewProject.academic_period} - {viewProject.cycle}</p></div><div><h4 className="text-xs font-bold text-brand-600 uppercase mb-1">Estado</h4><StatusBadge status={viewProject.status} /></div></div>
                <div><h3 className="text-lg font-semibold text-slate-900 mb-2 border-b border-slate-200 pb-1">Problemática</h3><div className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words bg-slate-50 p-3 rounded-md border border-slate-200">{viewProject.description}</div></div>
                {viewProject.objectives?.length > 0 && (<div><h3 className="text-lg font-semibold text-slate-900 mb-2 border-b border-slate-200 pb-1">Objetivos</h3><div className="pl-5 space-y-2 text-slate-600 break-words">{viewProject.objectives.map((obj, i) => <div key={i}>{obj}</div>)}</div></div>)}
                <div><h3 className="text-lg font-semibold text-slate-900 mb-2 border-b border-slate-200 pb-1">Tecnologías</h3><div className="flex flex-wrap gap-2">{getProjectSkillsDisplay(viewProject).map(skill => (<Badge key={skill.id} className="bg-slate-100 hover:bg-slate-200 text-slate-900">{skill.name}</Badge>))}</div></div>
              </div>
            )}
            {viewProject && (
              <div className="mt-4"><ProjectFilesPanel project={viewProject as any} userId={userId} isAdmin={!!isAdmin} /></div>
            )}
            {lineage.length > 1 && viewProject && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 border-b border-slate-200 pb-1 flex items-center gap-2"><GitBranch className="w-5 h-5 text-brand-600" /> Historial de continuidad</h3>
                <LineageTree nodes={lineage} currentId={viewProject.id} onOpen={(pid) => { openProject(pid) }} />
              </div>
            )}
            <DialogFooter className="gap-2">
              {viewProject?.reviewStatus === 'approved' && (
                <Button variant="outline" className="gap-2 border-brand-600 text-brand-700 hover:bg-brand-50" onClick={() => openBranchDialog(viewProject)}>
                  <GitBranch className="w-4 h-4" /> Continuar proyecto
                </Button>
              )}
              <Button onClick={() => setIsViewOpen(false)} className="bg-brand-700 hover:bg-brand-800 text-white">Cerrar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!branchTarget} onOpenChange={(open) => !open && setBranchTarget(null)}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 z-[100] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-700"><GitBranch className="w-5 h-5" /> Continuar proyecto</DialogTitle>
            <DialogDescription className="text-slate-500">
              Se creará un proyecto nuevo enlazado a <span className="font-semibold text-slate-900">{branchTarget?.name}</span>, con su problemática, objetivos y tecnologías como punto de partida. El original no se modifica{isStudent ? " y tu continuación quedará pendiente de revisión de tu docente" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="branch-name">Nombre de la continuación</Label>
            <Input id="branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="bg-white border-slate-300" />
            <Label htmlFor="branch-period" className="mt-3 block">Período académico de la continuación</Label>
            <select id="branch-period" value={branchPeriod} onChange={(e) => setBranchPeriod(e.target.value)} className="w-full h-9 rounded-md bg-white border border-slate-300 text-sm text-slate-900 px-3">
              {periods.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBranchTarget(null)}>Cancelar</Button>
            <Button onClick={handleBranch} disabled={loading || !branchName.trim()} className="gap-2"><GitBranch className="w-4 h-4" /> Crear continuación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay isVisible={loading} message="Procesando..." />
    </div>
  )
}
export default ProyectPage