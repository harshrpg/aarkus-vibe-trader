import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

interface LoadingComponentsProps {
    componentName: string;
}

export default function LoadingComponents({ componentName }: LoadingComponentsProps) {
    return (
        <div className="flex w-full max-w-xs flex-col gap-4 [--radius:1rem]">
            <Item variant="muted">
                <ItemMedia>
                    <Spinner />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle className="line-clamp-1">Loading component...</ItemTitle>
                </ItemContent>
                <ItemContent className="flex-none justify-end">
                    <span className="text-sm tabular-nums">{componentName}</span>
                </ItemContent>
            </Item>
        </div>
    )
}