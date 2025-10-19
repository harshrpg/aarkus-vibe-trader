import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'
import { ChevronDown, Ellipsis, Bell, Star, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-static'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-lg font-semibold leading-none">{value}</div>
            {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
        </div>
    )
}

function BadgeDelta({ value, positive = true }: { value: string; positive?: boolean }) {
    return (
        <Badge variant={positive ? 'default' : 'destructive'} className={cn('px-2 py-0 h-6 text-xs', positive ? 'bg-green-500 text-black hover:bg-green-500' : '')}>
            <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {value}
            </div>
        </Badge>
    )
}

export default function DashboardTestPage() {
    return (
        <div className="w-full p-6 md:p-8 lg:p-10 xl:p-12 2xl:p-14">
            {/* Top bar mimic */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="text-2xl font-semibold">Dashboard</div>
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <a className="hover:underline" href="#">Saved</a>
                        <a className="hover:underline" href="#">Lists</a>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select defaultValue="30d">
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Last 30 days" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="secondary" className="gap-1">
                        Generate
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatar.png" />
                        <AvatarFallback>WS</AvatarFallback>
                    </Avatar>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left column */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-muted-foreground">Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex items-end justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-4xl font-bold tracking-tight">$49,825.82</div>
                                    <div className="flex items-center gap-2">
                                        <BadgeDelta value={'+1.9%'} />
                                        <Badge className="h-6 px-2 py-0 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500 dark:text-black">$747.29</Badge>
                                    </div>
                                </div>
                                <Select defaultValue="30d">
                                    <SelectTrigger className="w-36">
                                        <SelectValue placeholder="Last 30 days" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7d">Last 7 days</SelectItem>
                                        <SelectItem value="30d">Last 30 days</SelectItem>
                                        <SelectItem value="90d">Last 90 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Chart placeholder */}
                            <div className="mt-6">
                                <div className="h-56 w-full rounded-md bg-muted" />
                                <div className="mt-3 text-xs text-muted-foreground">Rebalance 11-13</div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Stat label="Total profit" value="+$6,801.19" sub="+15.81%" />
                                <Stat label="Avg. monthly growing" value="~1.34%" sub="~$523" />
                                <Stat label="Best-profit token" value="Cardano" sub="ADA" />
                                <div className="flex flex-col gap-1">
                                    <div className="text-sm text-muted-foreground">Portfolio score</div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-lime-400 text-black hover:bg-lime-400">B</Badge>
                                        <div className="text-lg font-semibold leading-none">69 / 100</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">Good</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right column */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-muted-foreground">Allocation</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1 row-span-2 rounded-lg bg-cyan-400 text-black p-4">
                                    <div className="text-sm font-medium">Bitcoin BTC</div>
                                    <div className="mt-16 text-xs">0.264 19.62%</div>
                                </div>
                                <div className="rounded-lg bg-card p-4 border">
                                    <div className="text-sm">Cardano ADA</div>
                                    <div className="mt-8 text-xs text-muted-foreground">21,390 16.10%</div>
                                </div>
                                <div className="rounded-lg bg-card p-4 border">
                                    <div className="text-sm">Algorand ALGO</div>
                                    <div className="mt-8 text-xs text-muted-foreground">44,351 11.66%</div>
                                </div>
                                <div className="rounded-lg bg-card p-4 border">
                                    <div className="text-sm">Polkadot DOT</div>
                                    <div className="mt-8 text-xs text-muted-foreground">1,096 11.24%</div>
                                </div>
                                <div className="rounded-lg bg-card p-4 border flex items-center justify-between">
                                    <div>
                                        <div className="text-sm">Power Ledger POWR</div>
                                        <div className="mt-2 text-xs text-muted-foreground">21,017 10.97%</div>
                                    </div>
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="rounded-lg bg-card p-4 border flex items-center justify-between">
                                    <div>
                                        <div className="text-sm">SolarCoin SLR</div>
                                        <div className="mt-2 text-xs text-muted-foreground">104,080 9.61%</div>
                                    </div>
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="rounded-lg bg-card p-4 border">
                                    <div className="text-sm">Chainlink LINK</div>
                                    <div className="mt-2 text-xs text-muted-foreground">304 8.52%</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-muted-foreground">Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground">
                                    <tr className="border-b">
                                        <th className="text-left py-2 font-normal">Token</th>
                                        <th className="text-left py-2 font-normal">Amount</th>
                                        <th className="text-left py-2 font-normal">Value</th>
                                        <th className="text-left py-2 font-normal">Allocation</th>
                                        <th className="text-left py-2 font-normal">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-3">Bitcoin</td>
                                            <td className="py-3">0.264</td>
                                            <td className="py-3">$9,767.63</td>
                                            <td className="py-3">19.62%</td>
                                            <td className="py-3">$36,998.62</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}


